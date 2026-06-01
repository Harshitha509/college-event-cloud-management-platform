window.renderEvents = async function(appDiv) {
    appDiv.innerHTML = '<div class="container section"><h2>Upcoming Events (Real-Time)</h2><div id="eventsList" class="grid-container"><div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Checking cloud...</div></div></div>';
    try {
        const events = await apiCall('/events');
        
        // Fetch current user registrations if logged in
        let myRegs = [];
        if (state.token) {
            try {
                myRegs = await apiCall('/events/my-registrations');
            } catch(e) { console.error('Failed to fetch user registrations for UI labels', e); }
        }

        if (events.length === 0) {
            document.getElementById('eventsList').innerHTML = '<p>No events found. Check back later!</p>';
            return;
        }
        const evHtml = events.map(e => {
            let finalImageUrl = '';
            if (e.imageUrl) {
                if (e.imageUrl.startsWith('data:') || e.imageUrl.startsWith('http')) finalImageUrl = e.imageUrl;
                else finalImageUrl = 'https://smart-event-api.onrender.com' + e.imageUrl;
            }
            const posterHtml = finalImageUrl ? `<img src="${finalImageUrl}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:1rem;" alt="Event Poster">` : '';
            const detailsHtml = e.detailsFileUrl ? `<a href="${e.detailsFileUrl}" download="${e.detailsFileName || 'event-details'}" class="btn btn-secondary btn-block" style="margin-top: 0.5rem;"><i class="fa-solid fa-file-arrow-down"></i> Download Details Document</a>` : '';
            
            let deleteBtn = '';
            if (state.token && state.user) {
                const isOwner = e.organizer_id && (e.organizer_id._id === state.user.id || e.organizer_id === state.user.id);
                if (state.user.role === 'admin' || (state.user.role === 'organizer' && isOwner)) {
                    deleteBtn = `
                    <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                        <button onclick="window.location.hash='#/edit-event?id=${e._id}'" class="btn btn-secondary" style="flex:1;"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button onclick="deleteEvent('${e._id}')" class="btn btn-secondary" style="flex:1; color: #ef4444; border-color: #ef4444;"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>`;
                }
            }

            // Enforce visual registration button checking
            let regBtn = '';
            const userClaim = myRegs.find(r => r.event_id && (r.event_id._id === e._id || r.event_id === e._id));
            
            if (userClaim) {
                if (userClaim.status === 'waitlisted') {
                    regBtn = `<button onclick="window.location.hash='#/dashboard'" class="btn btn-secondary btn-block" style="margin-top:1rem; color:#f59e0b; border-color:rgba(245,158,11,0.3);"><i class="fa-solid fa-hourglass-half"></i> Waitlisted (Queue)</button>`;
                } else {
                    regBtn = `<button onclick="window.location.hash='#/dashboard'" class="btn btn-secondary btn-block" style="margin-top:1rem; color:#10b981; border-color:rgba(16,185,129,0.3);"><i class="fa-solid fa-circle-check"></i> Registered (View Ticket)</button>`;
                }
            } else {
                const cap = e.capacity || 0;
                const regCount = e.registeredCount || 0;
                const isFull = cap > 0 && regCount >= cap;
                
                if (isFull) {
                    regBtn = `<button onclick="registerEvent('${e._id}')" class="btn btn-secondary btn-block" style="margin-top:1rem; color:#f59e0b; border-color:rgba(245,158,11,0.3);"><i class="fa-solid fa-plus"></i> Join Waitlist (Event Full)</button>`;
                } else {
                    regBtn = `<button onclick="registerEvent('${e._id}')" class="btn btn-primary btn-block" style="margin-top:1rem;"><i class="fa-solid fa-ticket"></i> Register Now (QR Ticket)</button>`;
                }
            }

            // Seats remaining counter text
            let seatsText = '';
            if (e.capacity) {
                const remains = Math.max(0, e.capacity - (e.registeredCount || 0));
                if (remains === 0) {
                    seatsText = `<p style="font-size:0.85rem; color:#f59e0b; font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> Waitlist active (Event full)</p>`;
                } else {
                    seatsText = `<p style="font-size:0.85rem; color:#10b981; font-weight:600;"><i class="fa-solid fa-chair"></i> ${remains} seats remaining (Capacity: ${e.capacity})</p>`;
                }
            }

            return `
            <div class="card">
                ${posterHtml}
                <h3>${e.title}</h3>
                <p><i class="fa-regular fa-calendar"></i> ${new Date(e.date).toLocaleDateString()}</p>
                <p><i class="fa-solid fa-location-dot"></i> ${e.venue}</p>
                ${seatsText}
                <p style="font-size:0.9rem; color:var(--text-secondary); margin-top:0.5rem;">${e.description}</p>
                ${regBtn}
                ${detailsHtml}
                ${deleteBtn}
                <div style="margin-top:0.8rem; border-top:1px solid var(--surface-border); padding-top:0.8rem;">
                    <a href="#" onclick="toggleEventReviews(event, '${e._id}')" style="font-size:0.85rem; font-weight:600;"><i class="fa-regular fa-comment-dots"></i> Student Reviews</a>
                    <div id="reviews-viewer-${e._id}" style="display:none; margin-top:0.8rem; text-align:left; background:rgba(0,0,0,0.15); padding:1rem; border-radius:12px; border:1px solid var(--surface-border); max-height:200px; overflow-y:auto;">
                        <div class="loader-small" style="font-size:0.8rem; color:var(--text-secondary); text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Checking reviews...</div>
                    </div>
                </div>
            </div>
        `}).join('');
        document.getElementById('eventsList').innerHTML = evHtml;
    } catch (err) {
        document.getElementById('eventsList').innerHTML = '<p style="color:red;">Failed to retrieve events. Ensure backend is running.</p>';
    }
}

window.registerEvent = async function (id) {
    if (!state.token) {
        showToast('Please login to register for an event.', 'error');
        window.location.hash = '#/login';
        return;
    }
    try {
        const data = await apiCall(`/events/${id}/register`, 'POST');
        showToast('Registered Successfully! Email has been sent.');
        router(); // Instantly update dynamic state and button labels
    } catch(err) { showToast(err.message, 'error'); }
}

window.deleteEvent = async function (id) {
    if (!confirm("Are you sure you want to permanently delete this event? All registrations will be removed.")) return;
    try {
        const res = await apiCall(`/events/${id}`, 'DELETE');
        showToast(res.msg || 'Event deleted successfully.');
        router();
    } catch(err) { showToast(err.message, 'error'); }
}

window.renderCreateEvent = async function(appDiv) {
   if(!state.token || state.user.role === 'participant') return window.location.hash = '#/';
   appDiv.innerHTML = `
        <div class="container section">
            <h2 class="text-center" style="margin-bottom:2rem;">Host a New Event</h2>
            <form id="createEventForm" class="form-container" style="max-width: 600px;">
                <label>Event Title</label>
                <input type="text" id="title" placeholder="E.g., Tech Conference 2026" required class="form-control">
                
                <label>Description</label>
                <textarea id="description" placeholder="What is this event about?" required class="form-control" rows="4"></textarea>
                
                <label>Date & Time</label>
                <input type="datetime-local" id="date" required class="form-control">
                
                <label>Venue / Location</label>
                <input type="text" id="venue" placeholder="Main Auditorium" required class="form-control">
                
                <label>Upload Cloud Poster (Image)</label>
                <input type="file" id="poster" accept="image/*" class="form-control" required style="padding:0.5rem;">

                <label>Upload Details Document (Optional PDF/Word File)</label>
                <input type="file" id="detailsFile" accept=".pdf,.doc,.docx,.txt" class="form-control" style="padding:0.5rem;">

                <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">Publish Event to Cloud</button>
            </form>
        </div>
   `;
   document.getElementById('createEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', e.target.title.value);
            formData.append('description', e.target.description.value);
            formData.append('date', e.target.date.value);
            formData.append('venue', e.target.venue.value);
            formData.append('poster', e.target.poster.files[0]);
            if(e.target.detailsFile.files.length > 0) formData.append('detailsFile', e.target.detailsFile.files[0]);

            await apiCall('/events', 'POST', formData, true); 
            showToast('Event & Resources successfully uploaded to Cloud Database!');
            window.location.hash = '#/events';
        } catch(err) { showToast(err.message, 'error'); }
   });
}

window.renderEditEvent = async function(appDiv) {
   if(!state.token || state.user.role === 'participant') return window.location.hash = '#/';
   
   const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
   const eventId = urlParams.get('id');
   if(!eventId) return window.location.hash = '#/events';

   appDiv.innerHTML = '<div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading event data...</div>';
   try {
       const events = await apiCall('/events');
       const event = events.find(e => e._id === eventId);
       if(!event) throw new Error('Event not found');

       const dateObj = new Date(event.date);
       const dateStr = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0,16);

       appDiv.innerHTML = `
            <div class="container section">
                <h2 class="text-center" style="margin-bottom:2rem;">Edit Event</h2>
                <form id="editEventForm" class="form-container" style="max-width: 600px;">
                    <label>Event Title</label>
                    <input type="text" id="title" value="${event.title}" required class="form-control">
                    
                    <label>Description</label>
                    <textarea id="description" required class="form-control" rows="4">${event.description}</textarea>
                    
                    <label>Date & Time</label>
                    <input type="datetime-local" id="date" value="${dateStr}" required class="form-control">
                    
                    <label>Venue / Location</label>
                    <input type="text" id="venue" value="${event.venue}" required class="form-control">
                    
                    <label>Upload New Poster (Optional)</label>
                    <input type="file" id="poster" accept="image/*" class="form-control" style="padding:0.5rem;">

                    <label>Upload Details Document (Optional PDF/Word File)</label>
                    <input type="file" id="detailsFile" accept=".pdf,.doc,.docx,.txt" class="form-control" style="padding:0.5rem;">

                    <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">Save Changes</button>
                    <button type="button" onclick="window.location.hash='#/events'" class="btn btn-secondary btn-block">Cancel</button>
                </form>
            </div>
       `;
       document.getElementById('editEventForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData();
                formData.append('title', e.target.title.value);
                formData.append('description', e.target.description.value);
                formData.append('date', e.target.date.value);
                formData.append('venue', e.target.venue.value);
                if(e.target.poster.files.length > 0) formData.append('poster', e.target.poster.files[0]);
                if(e.target.detailsFile.files.length > 0) formData.append('detailsFile', e.target.detailsFile.files[0]);

                await apiCall('/events/' + eventId, 'PUT', formData, true);
                showToast('Event successfully updated!');
                window.location.hash = '#/events';
            } catch(err) { showToast(err.message, 'error'); }
       });
    } catch(err) {
        appDiv.innerHTML = `<div class="container section"><p style="color:red; text-align:center;">${err.message}</p></div>`;
    }
}

window.toggleEventReviews = async function(e, eventId) {
    e.preventDefault();
    const viewer = document.getElementById(`reviews-viewer-${eventId}`);
    if (viewer.style.display === 'block') {
        viewer.style.display = 'none';
        return;
    }
    
    viewer.style.display = 'block';
    try {
        const reviews = await apiCall(`/events/${eventId}/feedback`);
        if (reviews.length === 0) {
            viewer.innerHTML = `<p style="font-size:0.8rem; color:var(--text-secondary); margin:0; text-align:center;">No reviews posted yet.</p>`;
            return;
        }

        viewer.innerHTML = reviews.map(r => `
            <div style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.6rem; margin-bottom:0.6rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.2rem;">
                    <strong style="font-size:0.85rem; color:var(--text-primary);">${r.user_id ? r.user_id.name : 'Attendee'}</strong>
                    <span style="color:#f59e0b; font-size:0.8rem;">
                        ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                    </span>
                </div>
                <p style="font-size:0.8rem; color:var(--text-secondary); margin:0; line-height:1.4;">${r.comment}</p>
            </div>
        `).join('');
    } catch(err) {
        viewer.innerHTML = `<p style="font-size:0.8rem; color:#ef4444; margin:0;">Failed to load reviews.</p>`;
    }
}
