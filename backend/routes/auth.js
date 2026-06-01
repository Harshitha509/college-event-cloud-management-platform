const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');


// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Strict email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ msg: 'Please provide a valid email address' });
        }

        // Strict password validation (8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                msg: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' 
            });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ name, email, password, role });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        // Check if locked out
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
            return res.status(403).json({ msg: `Account is locked due to multiple failed login attempts. Try again in ${minutesLeft} minute(s).` });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Increment failed attempts
            user.loginAttempts += 1;
            if (user.loginAttempts >= 5) {
                user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
                await user.save();
                return res.status(403).json({ msg: 'Invalid Credentials. Account has been locked for 15 minutes due to 5 consecutive failed attempts.' });
            } else {
                await user.save();
                const remaining = 5 - user.loginAttempts;
                return res.status(400).json({ msg: `Invalid Credentials. ${remaining} attempt(s) remaining before lockout.` });
            }
        }

        // Reset locking on successful login
        user.loginAttempts = 0;
        user.lockUntil = 0;
        await user.save();

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// POST /api/auth/forgot-password - Send Reset OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User with this email does not exist.' });
        }

        // Generate 6-digit verification OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save to Database (expires in 10 minutes)
        await OTP.deleteOne({ email });
        const newOtp = new OTP({
            email,
            otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });
        await newOtp.save();

        // Print reset code to console and return success
        console.log(`🔑 [OTP SYSTEM] Password reset code for ${email} is: ${otp}`);
        res.json({ msg: `Reset code generated! [DIAGNOSTIC DEVELOPER ONLY: Your code is ${otp}]` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// POST /api/auth/reset-password - Verify OTP and Save
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        
        // Find OTP record
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ msg: 'Invalid or expired verification code.' });
        }

        // Strict password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ 
                msg: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' 
            });
        }

        // Hash and Update User
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        await User.updateOne(
            { email },
            { 
                password: hashedPassword,
                loginAttempts: 0,
                lockUntil: 0 
            }
        );

        // Delete used OTP
        await OTP.deleteOne({ email });

        res.json({ msg: 'Password reset successful! You can now sign in.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
