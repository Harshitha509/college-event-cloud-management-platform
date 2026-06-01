// --- Global State & Configuration ---
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname === '' || 
                window.location.protocol === 'file:' || 
                window.location.hostname.startsWith('192.168.') || 
                window.location.hostname.startsWith('10.') || 
                window.location.hostname.includes('.local');

const API_URL = isLocal ? `http://${window.location.hostname || 'localhost'}:5000/api` : 'https://smart-event-api.onrender.com/api'; 
const state = {
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user')) || null,
};

// --- WebSockets Initialization ---
const socket = io(isLocal ? `http://${window.location.hostname || 'localhost'}:5000` : 'https://smart-event-api.onrender.com');

socket.on('newEvent', (data) => {
    if(window.location.hash === '#/events') {
        if (typeof window.router === 'function') window.router();
    }
});
socket.on('eventDeleted', (id) => {
    if(window.location.hash === '#/events' || window.location.hash === '#/calendar') {
        if (typeof window.router === 'function') window.router();
    }
});
socket.on('attendanceUpdate', (data) => {
    if(window.location.hash === '#/admin') {
        if (typeof window.router === 'function') window.router();
    }
});
socket.on('newRegistration', (data) => {
    if(window.location.hash === '#/events' || window.location.hash === '#/dashboard' || window.location.hash === '#/admin') {
        if (typeof window.router === 'function') window.router();
    }
});

// --- Global Toast Helper ---
window.showToast = function(msg, type = 'success') {
    Toastify({
        text: msg,
        duration: 4000,
        close: true,
        gravity: "bottom",
        position: "center",
        style: {
            background: type === 'error' ? "linear-gradient(to right, #ef4444, #f87171)" : "linear-gradient(to right, #10b981, #34d399)",
            borderRadius: "8px",
            fontFamily: "Outfit, sans-serif",
            fontWeight: "500",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }
    }).showToast();
}

// --- API Helper ---
window.apiCall = async function(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const config = { method, headers };
    if (body) config.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(`${API_URL}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'API Error');
    return data;
}
