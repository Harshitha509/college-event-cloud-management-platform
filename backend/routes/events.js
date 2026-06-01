const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const auth = require('../middleware/auth');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Configure Multer using Memory Storage (fixes Render Ephemeral Disk Issue)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Email Automations
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER || 'system@yourdomain.com', pass: process.env.EMAIL_PASS || 'secret' }
});

// GET /api/events - List all
router.get('/', async (req, res) => {
    try {
        const events = await Event.find().populate('organizer_id', 'name');
        res.json(events);
    } catch (err) { res.status(500).send('Server error'); }
});

// POST /api/events - Create new event with Poster Upload & Details
router.post('/', auth, upload.fields([{name: 'poster', maxCount: 1}, {name: 'detailsFile', maxCount: 1}]), async (req, res) => {
    if(req.user.role === 'participant') return res.status(403).json({msg: 'Unauthorized'});
    try {
        let imageUrl = null;
        if(req.files && req.files['poster']) {
            const file = req.files['poster'][0];
            imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        }
        
        let detailsFileUrl = null;
        let detailsFileName = null;
        if(req.files && req.files['detailsFile']) {
            const file = req.files['detailsFile'][0];
            detailsFileUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            detailsFileName = file.originalname;
        }

        const newEvent = new Event({
            ...req.body,
            organizer_id: req.user.id,
            imageUrl,
            detailsFileUrl,
            detailsFileName
        });
        const event = await newEvent.save();
        
        // Push Real-time Event to WebSockets
        req.app.get('io').emit('newEvent', event);
        res.json(event);
    } catch (err) { res.status(500).send('Server error'); }
});

// Register & Email Action
router.post('/:id/register', auth, async (req, res) => {
    try {
        const event_id = req.params.id;
        const user_id = req.user.id;

        const event = await Event.findById(event_id);
        if (!event) return res.status(404).json({ msg: 'Event not found' });

        const existing = await Registration.findOne({ event_id, user_id });
        if (existing) return res.status(400).json({ msg: 'Already registered' });

        // Enforce capacity check to decide if user is waitlisted
        const activeCount = await Registration.countDocuments({ event_id, status: 'registered' });
        const isWaitlisted = event.capacity && activeCount >= event.capacity;
        const status = isWaitlisted ? 'waitlisted' : 'registered';

        const ticket_id = `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        // Encode a physical web URL so phone cameras can natively open it
        const qrCodeData = await QRCode.toDataURL(`https://event-management-bms.netlify.app/#/dashboard?scan=${ticket_id}`);

        const newRegistration = new Registration({ event_id, user_id, ticket_id, qrCodeData, status });
        const reg = await newRegistration.save();

        // Push real time analytics trigger
        req.app.get('io').emit('newRegistration', { event_id });
        
        // Outbound Email Delivery
        try {
            const user = await require('../models/User').findById(user_id);
            if (isWaitlisted) {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: `Waitlisted: ${event.title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f59e0b; border-radius: 16px;">
                            <h2 style="color: #f59e0b; text-align: center;">Waitlisted ⏳</h2>
                            <p><strong>Event:</strong> ${event.title}</p>
                            <p><strong>Venue:</strong> ${event.venue}</p>
                            <p>This event has reached maximum capacity. You have been added to the waitlist. If an attendee cancels, you will be automatically promoted and emailed a VIP entry QR ticket.</p>
                        </div>
                    `
                });
                console.log(`[SMTP] Sent waitlist alert to ${user.email}`);
            } else {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: `Your VIP Ticket: ${event.title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                            <h2>You are officially registered! 🎉</h2>
                            <p><strong>Event:</strong> ${event.title}</p>
                            <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
                            <p><strong>Venue:</strong> ${event.venue}</p>
                            <p>Please present this QR Code ticket to the organizers at the entrance:</p>
                            <img src="cid:ticket_qr" alt="QR Ticket" style="width: 200px; height: 200px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);" />
                            <p style="margin-top: 10px;"><strong>Ticket ID:</strong> ${ticket_id}</p>
                        </div>
                    `,
                    attachments: [{
                        filename: 'qrcode.png',
                        content: qrCodeData.split("base64,")[1],
                        encoding: 'base64',
                        cid: 'ticket_qr'
                    }]
                });
                console.log(`[SMTP] Successfully sent QR ticket to ${user.email}`);
            }
        } catch (emailErr) {
            console.error('[SMTP] Email Delivery Failed:', emailErr.message);
        }

        res.json(reg);
    } catch(err) { res.status(500).send('Server error'); }
});

// POST /api/events/:id/cancel - Cancel registration and auto-promote
router.post('/:id/cancel', auth, async (req, res) => {
    try {
        const event_id = req.params.id;
        const user_id = req.user.id;

        const event = await Event.findById(event_id);
        if (!event) return res.status(404).json({ msg: 'Event not found' });

        const registration = await Registration.findOne({ event_id, user_id });
        if (!registration) return res.status(400).json({ msg: 'You are not registered for this event.' });

        const originalStatus = registration.status;
        await Registration.findByIdAndDelete(registration._id);

        req.app.get('io').emit('newRegistration', { event_id });

        // If the cancelled user was active, auto-promote the earliest waitlisted participant
        if (originalStatus === 'registered') {
            const nextWaitlisted = await Registration.findOne({ event_id, status: 'waitlisted' }).sort({ createdAt: 1 });
            if (nextWaitlisted) {
                nextWaitlisted.status = 'registered';
                await nextWaitlisted.save();

                req.app.get('io').emit('newRegistration', { event_id });

                // Dispatch Ticket to newly promoted user
                try {
                    const user = await require('../models/User').findById(nextWaitlisted.user_id);
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: user.email,
                        subject: `Promoted: Your VIP Ticket for ${event.title}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #10b981; border-radius: 16px;">
                                <h2 style="color: #10b981;">Good News! You have been promoted! 🎉</h2>
                                <p>A slot opened up, and you are now officially registered for the event.</p>
                                <p><strong>Event:</strong> ${event.title}</p>
                                <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
                                <p><strong>Venue:</strong> ${event.venue}</p>
                                <p>Please present this QR Code ticket at the entrance:</p>
                                <img src="cid:ticket_qr" alt="QR Ticket" style="width: 200px; height: 200px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);" />
                                <p style="margin-top: 10px;"><strong>Ticket ID:</strong> ${nextWaitlisted.ticket_id}</p>
                            </div>
                        `,
                        attachments: [{
                            filename: 'qrcode.png',
                            content: nextWaitlisted.qrCodeData.split("base64,")[1],
                            encoding: 'base64',
                            cid: 'ticket_qr'
                        }]
                    });
                    console.log(`[Waitlist] Auto-promoted and sent ticket email to ${user.email}`);
                } catch (emailErr) {
                    console.error('[Waitlist] Promoted ticket email failed:', emailErr.message);
                }
            }
        }

        res.json({ msg: 'Registration cancelled successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// QR Code Check In
router.post('/scan', auth, async (req, res) => {
    if(req.user.role === 'participant') return res.status(403).json({msg: 'Unauthorized'});
    try {
        const { ticket_id } = req.body;
        const registration = await Registration.findOne({ ticket_id });
        if (!registration) return res.status(404).json({ msg: 'Ticket not found' });
        
        // Guard against scanning waitlisted tickets
        if (registration.status === 'waitlisted') {
            return res.status(400).json({ msg: 'Cannot check-in. Participant is still on the waitlist.' });
        }

        if (registration.attendance_status) return res.status(400).json({ msg: 'Already checked in' });

        registration.attendance_status = true;
        registration.checkin_time = new Date();
        await registration.save();
        
        // Real-time Dashboard Pulse
        req.app.get('io').emit('attendanceUpdate', { ticket_id, event_id: registration.event_id });

        res.json({ msg: 'Attendance verified & logged successfully!', registration });
    } catch (err) { res.status(500).send('Server error'); }
});

// DELETE /api/events/:id - Delete an event
router.delete('/:id', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ msg: 'Event not found' });

        if (req.user.role === 'participant') {
            return res.status(403).json({ msg: 'Unauthorized' });
        }

        // Organizers can only delete their own events. Admins bypass this.
        if (req.user.role === 'organizer' && event.organizer_id.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized: You can only delete events you created.' });
        }

        await Event.findByIdAndDelete(req.params.id);
        await Registration.deleteMany({ event_id: req.params.id }); // Clean up all registrations
        
        // Push Real-time update to refresh event list
        req.app.get('io').emit('eventDeleted', req.params.id);
        
        res.json({ msg: 'Event successfully removed' });
    } catch (err) { res.status(500).send('Server error'); }
});

// PUT /api/events/:id - Edit an event
router.put('/:id', auth, upload.fields([{name: 'poster', maxCount: 1}, {name: 'detailsFile', maxCount: 1}]), async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ msg: 'Event not found' });

        if (req.user.role === 'participant') {
            return res.status(403).json({ msg: 'Unauthorized' });
        }

        // Organizers can only edit their own events. Admins bypass this.
        if (req.user.role === 'organizer' && event.organizer_id.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized: You can only edit events you created.' });
        }

        if(req.body.title) event.title = req.body.title;
        if(req.body.description) event.description = req.body.description;
        if(req.body.date) event.date = req.body.date;
        if(req.body.venue) event.venue = req.body.venue;
        
        if(req.files && req.files['poster']) {
            const file = req.files['poster'][0];
            event.imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        }
        if(req.files && req.files['detailsFile']) {
            const file = req.files['detailsFile'][0];
            event.detailsFileUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            event.detailsFileName = file.originalname;
        }

        await event.save();
        req.app.get('io').emit('newEvent', event); // Triggers frontend refresh
        res.json({ msg: 'Event successfully updated', event });
    } catch (err) { res.status(500).send('Server error'); }
});

// GET /api/events/my-registrations - Get active user's tickets
router.get('/my-registrations', auth, async (req, res) => {
    try {
        const registrations = await Registration.find({ user_id: req.user.id })
            .populate('event_id')
            .sort({ createdAt: -1 });
        res.json(registrations);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Advanced Analytics Data Pipeline
router.get('/admin/stats', auth, async (req, res) => {
    if(req.user.role === 'participant') return res.status(403).json({msg: 'Unauthorized'});
    try {
        const totalEvents = await Event.countDocuments();
        const totalUsers = await require('../models/User').countDocuments({ role: 'participant' });
        const totalRegistrations = await Registration.countDocuments();
        const checkedInCount = await Registration.countDocuments({ attendance_status: true });

        // Retrieve breakdown for graph generation
        const events = await Event.find();
        const barChartData = { labels: [], datasets: [{ data: [], label: 'Participants', backgroundColor: '#0066FF' }] };
        
        for(let e of events) {
            const count = await Registration.countDocuments({event_id: e._id});
            barChartData.labels.push(e.title);
            barChartData.datasets[0].data.push(count);
        }

        res.json({
            stats: { totalEvents, totalUsers, totalRegistrations, checkedInCount },
            barChartData
        });
    } catch (err) { res.status(500).send('Server error'); }
});

// POST /api/events/:id/feedback - Submit attendee reviews
router.post('/:id/feedback', auth, async (req, res) => {
    try {
        const event_id = req.params.id;
        const user_id = req.user.id;
        const { rating, comment } = req.body;

        if (!rating || !comment) {
            return res.status(400).json({ msg: 'Please provide both rating and review text.' });
        }

        const score = parseInt(rating);
        if (isNaN(score) || score < 1 || score > 5) {
            return res.status(400).json({ msg: 'Rating score must be an integer between 1 and 5.' });
        }

        // Verify if user registered and checked in successfully (attended)
        const checkin = await Registration.findOne({ event_id, user_id, attendance_status: true });
        if (!checkin) {
            return res.status(403).json({ msg: 'Only verified attendees who checked in at the door can submit event feedback.' });
        }

        // Verify if user already left feedback
        const Feedback = require('../models/Feedback');
        const existing = await Feedback.findOne({ event_id, user_id });
        if (existing) {
            return res.status(400).json({ msg: 'You have already submitted feedback for this event.' });
        }

        const newFeedback = new Feedback({
            event_id,
            user_id,
            rating: score,
            comment: comment.trim()
        });
        await newFeedback.save();

        res.json({ msg: 'Feedback submitted successfully! Thank you.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// GET /api/events/:id/feedback - Retrieve all reviews
router.get('/:id/feedback', async (req, res) => {
    try {
        const Feedback = require('../models/Feedback');
        const reviews = await Feedback.find({ event_id: req.params.id })
            .populate('user_id', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
