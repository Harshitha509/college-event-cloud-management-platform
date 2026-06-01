window.renderDashboard = async function(appDiv) {
    if(!state.token) return window.location.hash = '#/login';

    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const scanTicket = urlParams.get('scan');
    
    if (scanTicket && (state.user.role === 'admin' || state.user.role === 'organizer')) {
        try {
            const res = await apiCall('/events/scan', 'POST', { ticket_id: scanTicket });
            showToast('✅ ' + res.msg);
            window.location.hash = '#/dashboard';
        } catch(err) { 
            showToast('❌ ' + err.message, 'error'); 
            window.location.hash = '#/dashboard'; 
        }
    }

    appDiv.innerHTML = `
        <div class="container section">
            <h2>Welcome back, ${state.user.name} 👋</h2>
            <p style="color:var(--text-secondary); margin-bottom:2rem;">Logged in as: <strong style="color:var(--secondary-color);">${state.user.role.toUpperCase()}</strong></p>
            
            <!-- Quick Actions Panel -->
            <div style="background: var(--surface-dark); border: 1px solid var(--surface-border); padding: 2rem; border-radius:24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin-bottom: 2.5rem;">
                <h3>Quick Actions</h3>
                <div style="display:flex; gap: 1rem; margin-top: 1.5rem; flex-wrap:wrap;">
                    ${state.user.role !== 'participant' ? `
                        <button onclick="startCameraScan()" class="btn btn-primary"><i class="fa-solid fa-camera"></i> Camera Scan</button>
                        <button onclick="simulateScan()" class="btn btn-secondary"><i class="fa-solid fa-keyboard"></i> Manual Entry</button>
                    ` : ''}
                    <a href="#/events" class="btn btn-secondary"><i class="fa-solid fa-magnifying-glass"></i> View Event Catalog</a>
                    <a href="#/calendar" class="btn btn-secondary"><i class="fa-regular fa-calendar-days"></i> Calendar Grid</a>
                </div>
                
                <div id="qr-reader" style="width:100%; max-width:500px; display:none; margin-top:2rem; border-radius:12px; overflow:hidden; border: 1px solid var(--surface-border);"></div>
            </div>

            <!-- Participant Ticket Section -->
            <div id="participant-tickets-container">
                <h3 style="margin-bottom:1.5rem; font-family:var(--font-heading); font-size:1.8rem;"><i class="fa-solid fa-ticket" style="color:var(--secondary-color);"></i> My Registrations & Tickets</h3>
                <div id="ticketsList" class="grid-container" style="margin-top:0;">
                    <div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Checking seat claims...</div>
                </div>
            </div>
        </div>
    `;

    // Fetch and display user tickets
    loadUserTickets();
}

async function loadUserTickets() {
    const listDiv = document.getElementById('ticketsList');
    if (!listDiv) return;

    try {
        const regs = await apiCall('/events/my-registrations');
        if (regs.length === 0) {
            listDiv.innerHTML = `
                <div class="card text-center" style="grid-column: 1 / -1; padding: 3rem;">
                    <p style="color:var(--text-secondary); margin-bottom:1rem;">You have not registered for any events yet.</p>
                    <a href="#/events" class="btn btn-primary btn-block" style="max-width:250px; margin: 0 auto;">Claim Your First Seat</a>
                </div>
            `;
            return;
        }

        listDiv.innerHTML = regs.map(r => {
            const ev = r.event_id;
            if (!ev) return ''; // Null check in case event was deleted

            // Status Badge & Controls
            let statusBadge = '';
            let actionButtons = '';
            
            if (r.status === 'waitlisted') {
                statusBadge = `<span class="badge" style="background:rgba(245, 158, 11, 0.15); border:1px solid rgba(245, 158, 11, 0.3); color:#f59e0b; padding:0.4rem 0.8rem; border-radius:8px; font-size:0.8rem; font-weight:600; display:inline-block; margin-bottom:1rem;"><i class="fa-solid fa-hourglass-half"></i> Waitlisted (Queue)</span>`;
                actionButtons = `
                    <button onclick="cancelClaim('${ev._id}')" class="btn btn-secondary btn-block" style="color:#ef4444; border-color:rgba(239, 68, 68, 0.3); margin-top:1rem;"><i class="fa-solid fa-ban"></i> Cancel Position</button>
                `;
            } else {
                statusBadge = `<span class="badge" style="background:rgba(16, 185, 129, 0.15); border:1px solid rgba(16, 185, 129, 0.3); color:#10b981; padding:0.4rem 0.8rem; border-radius:8px; font-size:0.8rem; font-weight:600; display:inline-block; margin-bottom:1rem;"><i class="fa-solid fa-circle-check"></i> Seat Confirmed</span>`;
                
                // Add to Calendar Integration
                const calendarBtn = `<button onclick="downloadCalendarICS('${ev.title}', '${ev.date}', '${ev.venue}', '${ev.description}')" class="btn btn-secondary" style="flex:1; font-size:0.8rem; padding:0.6rem 1rem;"><i class="fa-solid fa-calendar-plus"></i> Add to Calendar</button>`;
                
                // Cancellation action
                const cancelBtn = `<button onclick="cancelClaim('${ev._id}')" class="btn btn-secondary" style="color:#ef4444; border-color:rgba(239, 68, 68, 0.2); font-size:0.8rem; padding:0.6rem 1rem;"><i class="fa-solid fa-trash"></i> Cancel</button>`;

                actionButtons = `
                    <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:1rem;">
                        <button onclick="toggleQRTicket('${r.ticket_id}', '${r.qrCodeData}')" class="btn btn-primary btn-block" style="margin-top:0;"><i class="fa-solid fa-qrcode"></i> View QR Ticket</button>
                        <div style="display:flex; gap:0.5rem; width:100%;">
                            ${calendarBtn}
                            ${cancelBtn}
                        </div>
                    </div>
                    <!-- QR Modal container -->
                    <div id="qr-container-${r.ticket_id}" style="display:none; text-align:center; padding:1.5rem; background:rgba(0,0,0,0.2); border:1px solid var(--surface-border); border-radius:16px; margin-top:1rem;">
                        <img src="${r.qrCodeData}" alt="QR Ticket" style="width:160px; height:160px; border-radius:8px; background:#fff; padding:5px; box-shadow:0 0 15px rgba(255,255,255,0.1); margin:0 auto;" />
                        <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-top:0.8rem; letter-spacing:1px;">ID: ${r.ticket_id}</div>
                        <div style="font-size:0.75rem; color:${r.attendance_status ? '#10b981' : 'var(--text-secondary)'}; margin-top:0.3rem; font-weight:600;">
                            ${r.attendance_status ? '<i class="fa-solid fa-circle-check"></i> Attendance Verified' : '<i class="fa-solid fa-clock"></i> Pending Scanner Verification'}
                        </div>
                    </div>
                `;

                // Attended feedback option
                if (r.attendance_status) {
                    actionButtons += `
                        <div id="feedback-section-${ev._id}" style="margin-top:1.2rem; border-top: 1px dashed var(--surface-border); padding-top:1rem;">
                            <button onclick="toggleFeedbackPanel('${ev._id}')" class="btn btn-secondary btn-block" style="color:var(--secondary-color); border-color:rgba(168,85,247,0.3);"><i class="fa-solid fa-pen-to-square"></i> Submit Event Feedback</button>
                            
                            <div id="feedback-panel-${ev._id}" style="display:none; margin-top:1rem; text-align:left;">
                                <label style="font-size:0.85rem; font-weight:600; color:var(--text-primary); display:block; margin-bottom:0.4rem;">Select Score Rating</label>
                                <div class="rating-selector" style="display:flex; gap:0.5rem; margin-bottom:0.8rem;">
                                    ${[1, 2, 3, 4, 5].map(star => `
                                        <i class="fa-regular fa-star star-btn" onclick="setFeedbackRating('${ev._id}', ${star})" id="star-${ev._id}-${star}" style="font-size:1.4rem; cursor:pointer; color:#f59e0b;"></i>
                                    `).join('')}
                                </div>
                                <input type="hidden" id="rating-value-${ev._id}" value="5">
                                <label style="font-size:0.85rem; font-weight:600; color:var(--text-primary); display:block; margin-bottom:0.4rem;">Your Review Comment</label>
                                <textarea id="comment-value-${ev._id}" placeholder="What did you think of the hackfest or seminar? Share your thoughts..." class="form-control" rows="3" style="font-size:0.9rem; margin-bottom:0.8rem; padding:0.6rem;"></textarea>
                                <button onclick="sendEventFeedback('${ev._id}')" class="btn btn-primary btn-block" style="font-size:0.8rem; padding:0.6rem 1rem;">Post Review</button>
                            </div>
                        </div>
                    `;
                }
            }

            return `
                <div class="card" style="border-top: 4px solid ${r.status === 'waitlisted' ? '#f59e0b' : '#10b981'};">
                    ${statusBadge}
                    <h3>${ev.title}</h3>
                    <p style="font-size:0.9rem;"><i class="fa-regular fa-calendar"></i> ${new Date(ev.date).toLocaleDateString()} - ${new Date(ev.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    <p style="font-size:0.9rem; margin-bottom:1rem;"><i class="fa-solid fa-location-dot"></i> ${ev.venue}</p>
                    ${actionButtons}
                </div>
            `;
        }).join('');

    } catch (err) {
        listDiv.innerHTML = `<p style="color:red; text-align:center;">Failed to retrieve claimed tickets: ${err.message}</p>`;
    }
}

// Toggle QRTicket code display
window.toggleQRTicket = function(ticketId, base64Data) {
    const container = document.getElementById(`qr-container-${ticketId}`);
    if (container.style.display === 'block') {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
    }
}

// Cancel Claim ticket
window.cancelClaim = async function(eventId) {
    if (!confirm('Are you sure you want to cancel this registration? If you are promoted, you will lose your seat.')) return;
    try {
        const res = await apiCall(`/events/${eventId}/cancel`, 'POST');
        showToast(res.msg || 'Registration cancelled successfully.');
        loadUserTickets();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Calendar Export (Download .ics)
window.downloadCalendarICS = function(eventTitle, eventDate, eventVenue, eventDescription) {
    try {
        const date = new Date(eventDate);
        const formatDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const startDate = formatDate(date);
        const endDate = formatDate(new Date(date.getTime() + 2 * 60 * 60 * 1000)); // 2 hours default
        
        const cleanDesc = eventDescription ? eventDescription.replace(/\r?\n/g, "\\n") : 'BMS College Event';

        const icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//EventCloud//Campus Event Planner//EN",
            "BEGIN:VEVENT",
            `UID:${Math.random().toString(36).substr(2, 9)}@eventcloud.com`,
            `DTSTAMP:${formatDate(new Date())}`,
            `DTSTART:${startDate}`,
            `DTEND:${endDate}`,
            `SUMMARY:${eventTitle}`,
            `DESCRIPTION:${cleanDesc}`,
            `LOCATION:${eventVenue}`,
            "END:VEVENT",
            "END:VCALENDAR"
        ].join("\r\n");

        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Calendar schedule file downloaded successfully.");
    } catch (err) {
        showToast("Failed to compile calendar download.", 'error');
    }
}

// Feedback controls
window.toggleFeedbackPanel = function(eventId) {
    const panel = document.getElementById(`feedback-panel-${eventId}`);
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    if (panel.style.display === 'block') {
        setFeedbackRating(eventId, 5); // Default 5 stars
    }
}

window.setFeedbackRating = function(eventId, rating) {
    document.getElementById(`rating-value-${eventId}`).value = rating;
    for (let star = 1; star <= 5; star++) {
        const starBtn = document.getElementById(`star-${eventId}-${star}`);
        if (starBtn) {
            if (star <= rating) {
                starBtn.className = 'fa-solid fa-star star-btn';
            } else {
                starBtn.className = 'fa-regular fa-star star-btn';
            }
        }
    }
}

window.sendEventFeedback = async function(eventId) {
    const rating = document.getElementById(`rating-value-${eventId}`).value;
    const comment = document.getElementById(`comment-value-${eventId}`).value;
    
    if (!comment.trim()) {
        showToast('Please type a review comment.', 'error');
        return;
    }

    try {
        const res = await apiCall(`/events/${eventId}/feedback`, 'POST', { rating, comment });
        showToast(res.msg || 'Review submitted successfully.');
        const section = document.getElementById(`feedback-section-${eventId}`);
        if (section) {
            section.innerHTML = `<p style="color:#10b981; font-weight:600; font-size:0.9rem; text-align:center;"><i class="fa-solid fa-circle-check"></i> Thank you! Review published successfully.</p>`;
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Existing Camera elements
let html5QrcodeScanner;
window.startCameraScan = function() {
    const qrReaderDiv = document.getElementById('qr-reader');
    if(qrReaderDiv.style.display === 'block') {
        qrReaderDiv.style.display = 'none';
        if(html5QrcodeScanner) html5QrcodeScanner.clear();
        return;
    }
    
    qrReaderDiv.style.display = 'block';
    
    html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: {width: 250, height: 250} },
        false);
        
    html5QrcodeScanner.render(async (decodedText, decodedResult) => {
        html5QrcodeScanner.clear();
        qrReaderDiv.style.display = 'none';
        
        const ticketId = decodedText.includes('scan=') ? decodedText.split('scan=')[1] : decodedText;
        
        try {
            const res = await apiCall('/events/scan', 'POST', { ticket_id: ticketId });
            showToast('✅ SUCCESS: ' + res.msg);
        } catch(err) { showToast('❌ ERROR: ' + err.message, 'error'); }
    }, (errorMessage) => { });
}

window.simulateScan = async function() {
    const ticketId = prompt('Scanner Simulator: Enter the Ticket ID (e.g. TKT-XXXXXX):');
    if(!ticketId) return;
    try {
        const res = await apiCall('/events/scan', 'POST', { ticket_id: ticketId });
        showToast('✅ SUCCESS: ' + res.msg);
    } catch(err) { showToast('❌ ERROR: ' + err.message, 'error'); }
}

window.renderAdminDashboard = async function(appDiv) {
   if(!state.token || state.user.role !== 'admin') return window.location.hash = '#/';
   appDiv.innerHTML = '<div class="container section"><h2>Admin Analytics Hub</h2><div id="adminStats"><div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Compiling Big Data...</div></div></div>';
   try {
       const res = await apiCall('/events/admin/stats');
       const stats = res.stats;
       const chartData = res.barChartData;

       document.getElementById('adminStats').innerHTML = `
           <div class="grid-container" style="margin-bottom:3rem;">
               <div class="card bg-primary text-center">
                   <h3>${stats.totalEvents}</h3>
                   <p>Total Events</p>
               </div>
               <div class="card text-center">
                   <h3 style="font-size:2.5rem; color:var(--text-primary);">${stats.totalUsers}</h3>
                   <p>Active Participants</p>
               </div>
               <div class="card text-center">
                   <h3 style="font-size:2.5rem; color:var(--text-primary);">${stats.totalRegistrations}</h3>
                   <p>Total Registrations</p>
               </div>
               <div class="card text-center" style="border-left: 4px solid #10b981;">
                   <h3 style="font-size:2.5rem; color:#10b981;">${stats.checkedInCount}</h3>
                   <p>Verified Scans</p>
               </div>
           </div>

           <div class="grid-container" style="grid-template-columns: 1fr 1fr;">
                <div class="card">
                    <h3 style="text-align:center; margin-bottom:1rem;">Registrations per Event</h3>
                    <canvas id="barChart"></canvas>
                </div>
                <div class="card">
                    <h3 style="text-align:center; margin-bottom:1rem;">System Breakdown</h3>
                    <canvas id="pieChart"></canvas>
                </div>
           </div>
       `;

       new Chart(document.getElementById('barChart'), {
           type: 'bar',
           data: { labels: chartData.labels, datasets: chartData.datasets },
           options: { responsive: true, color: '#f8fafc', scales: { x: { ticks: {color: '#94a3b8'} }, y: { ticks: {color: '#94a3b8'} } } }
       });

       new Chart(document.getElementById('pieChart'), {
           type: 'doughnut',
           data: {
               labels: ['Unregistered Users', 'Registrations', 'Verified Attendance'],
               datasets: [{
                   data: [stats.totalUsers - stats.totalRegistrations, stats.totalRegistrations - stats.checkedInCount, stats.checkedInCount],
                   backgroundColor: ['rgba(255,255,255,0.1)', '#a855f7', '#10b981'],
                   borderColor: '#09090b', borderWidth: 2
               }]
           },
           options: { responsive: true, color: '#f8fafc' }
       });

   } catch(err) {
       document.getElementById('adminStats').innerHTML = '<p style="color:red;">Failed to load analytics dashboard.</p>';
   }
}
