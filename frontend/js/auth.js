window.renderLogin = async function(appDiv) {
    appDiv.innerHTML = `
        <div class="container section">
            <h2 class="text-center" style="margin-bottom:2rem; font-family:var(--font-heading);">Log In to EventCloud</h2>
            <form id="loginForm" class="form-container">
                <input type="email" id="email" placeholder="Email Address" required class="form-control">
                
                <div style="position:relative; width:100%;">
                    <input type="password" id="password" placeholder="Password" required class="form-control" style="padding-right: 3rem;">
                    <i id="togglePassword" class="fa-solid fa-eye" style="position:absolute; right:16px; top:16px; cursor:pointer; color:var(--text-secondary); font-size:1.1rem; transition:0.2s;"></i>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block">Sign In</button>
                <div style="margin-top: 1rem; text-align: center;">
                    <a href="#/forgot-password" style="font-size: 0.85rem; color: var(--text-secondary);">Forgot Password?</a>
                </div>
                <p class="text-center" style="margin-top:1.5rem;font-size:0.95rem; color:var(--text-secondary);">
                    Don't have an account? <a href="#/signup" style="font-weight:600;">Sign Up</a>
                </p>
            </form>
        </div>
    `;

    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.className = type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
        });
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        try {
            const data = await apiCall('/auth/login', 'POST', {
                email: form.email.value,
                password: form.password.value
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            state.token = data.token; state.user = data.user;
            showToast('Login successful! Welcome back.');
            window.location.hash = '#/dashboard';
        } catch (err) { 
            showToast(err.message, 'error'); 
            form.classList.add('shake-error');
            setTimeout(() => form.classList.remove('shake-error'), 500);
        }
    });
}

window.renderSignup = async function(appDiv) {
    appDiv.innerHTML = `
        <div class="container section">
            <h2 class="text-center" style="margin-bottom:2rem; font-family:var(--font-heading);">Create an Account</h2>
            <form id="signupForm" class="form-container" style="max-width: 500px;">
                <input type="text" id="name" placeholder="Full Name" required class="form-control">
                <input type="email" id="email" placeholder="Email Address" required class="form-control">
                
                <div style="position:relative; width:100%;">
                    <input type="password" id="password" placeholder="Password" required class="form-control" style="padding-right: 3rem;">
                    <i id="togglePassword" class="fa-solid fa-eye" style="position:absolute; right:16px; top:16px; cursor:pointer; color:var(--text-secondary); font-size:1.1rem; transition:0.2s;"></i>
                </div>
                
                <!-- Password Strength Meter -->
                <div id="password-strength-container" style="margin-top:-0.5rem; margin-bottom:1.5rem; display:none; background:rgba(0,0,0,0.15); padding:1rem; border-radius:12px; border:1px solid var(--surface-border);">
                    <div class="strength-bar-bg" style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px; overflow:hidden; margin-bottom:0.6rem;">
                        <div id="strength-bar" style="height:100%; width:0%; transition:all 0.3s ease;"></div>
                    </div>
                    <div id="strength-text" style="font-size:0.85rem; font-weight:600; margin-bottom:0.6rem; color:var(--text-secondary);">Strength: Weak</div>
                    <ul class="strength-requirements" style="font-size:0.75rem; color:var(--text-secondary); padding-left:0; display:grid; grid-template-columns:1fr 1fr; gap:0.4rem; list-style:none;">
                        <li id="req-length" class="req-item" style="display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> 8+ Characters</li>
                        <li id="req-upper" class="req-item" style="display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> 1 Uppercase</li>
                        <li id="req-lower" class="req-item" style="display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> 1 Lowercase</li>
                        <li id="req-number" class="req-item" style="display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> 1 Number</li>
                        <li id="req-special" class="req-item" style="grid-column: span 2; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> 1 Special Symbol (@$!%*?&)</li>
                    </ul>
                </div>

                <input type="password" id="confirmPassword" placeholder="Confirm Password" required class="form-control">
                <div id="match-error" style="font-size:0.85rem; color:#ef4444; margin-top:-0.8rem; margin-bottom:1.2rem; display:none; font-weight:500;">
                    <i class="fa-solid fa-circle-exclamation"></i> Passwords do not match
                </div>

                <select id="role" class="form-control">
                    <option value="participant">Participant (Attendee)</option>
                    <option value="organizer">Organizer (Host Events)</option>
                    <option value="admin">Admin (System Manager)</option>
                </select>
                
                <button type="submit" class="btn btn-primary btn-block" style="margin-top:1.5rem;">Register Account</button>
                <p class="text-center" style="margin-top:1.5rem;font-size:0.95rem; color:var(--text-secondary);">
                    Already have an account? <a href="#/login" style="font-weight:600;">Log In</a>
                </p>
            </form>
        </div>
    `;

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthContainer = document.getElementById('password-strength-container');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');
    const matchError = document.getElementById('match-error');
    
    const reqLength = document.getElementById('req-length');
    const reqUpper = document.getElementById('req-upper');
    const reqLower = document.getElementById('req-lower');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    const togglePassword = document.getElementById('togglePassword');
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.className = type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    });

    function updateReq(elem, isValid) {
        const icon = elem.querySelector('i');
        if (isValid) {
            icon.className = 'fa-solid fa-circle-check';
            icon.style.color = '#10b981';
            elem.style.color = '#10b981';
        } else {
            icon.className = 'fa-solid fa-circle-xmark';
            icon.style.color = '#ef4444';
            elem.style.color = 'var(--text-secondary)';
        }
    }

    function checkPassword() {
        const val = passwordInput.value;
        if (!val) {
            strengthContainer.style.display = 'none';
            return false;
        }
        strengthContainer.style.display = 'block';

        const hasLength = val.length >= 8;
        const hasUpper = /[A-Z]/.test(val);
        const hasLower = /[a-z]/.test(val);
        const hasNumber = /\d/.test(val);
        const hasSpecial = /[@$!%*?&]/.test(val);

        updateReq(reqLength, hasLength);
        updateReq(reqUpper, hasUpper);
        updateReq(reqLower, hasLower);
        updateReq(reqNumber, hasNumber);
        updateReq(reqSpecial, hasSpecial);

        const score = (hasLength ? 1 : 0) + (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);

        if (score <= 2) {
            strengthBar.style.width = '33%';
            strengthBar.style.background = '#ef4444'; // Red
            strengthText.innerText = 'Strength: Weak';
            strengthText.style.color = '#ef4444';
        } else if (score <= 4) {
            strengthBar.style.width = '66%';
            strengthBar.style.background = '#f59e0b'; // Amber
            strengthText.innerText = 'Strength: Moderate';
            strengthText.style.color = '#f59e0b';
        } else {
            strengthBar.style.width = '100%';
            strengthBar.style.background = '#10b981'; // Green
            strengthText.innerText = 'Strength: Excellent (Strict)';
            strengthText.style.color = '#10b981';
        }

        return score === 5;
    }

    passwordInput.addEventListener('input', () => {
        checkPassword();
        checkMatch();
    });

    function checkMatch() {
        if (!confirmPasswordInput.value) {
            matchError.style.display = 'none';
            return false;
        }
        if (passwordInput.value !== confirmPasswordInput.value) {
            matchError.style.display = 'block';
            confirmPasswordInput.style.borderColor = '#ef4444';
            return false;
        } else {
            matchError.style.display = 'none';
            confirmPasswordInput.style.borderColor = '#10b981';
            return true;
        }
    }

    confirmPasswordInput.addEventListener('input', checkMatch);

    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        
        // Strict client-side check
        const isPassValid = checkPassword();
        const isMatchValid = checkMatch();
        
        if (!isPassValid) {
            showToast('Password is too weak. Please fulfill all security criteria.', 'error');
            form.classList.add('shake-error');
            setTimeout(() => form.classList.remove('shake-error'), 500);
            return;
        }
        
        if (!isMatchValid) {
            showToast('Passwords do not match.', 'error');
            form.classList.add('shake-error');
            setTimeout(() => form.classList.remove('shake-error'), 500);
            return;
        }

        try {
            const data = await apiCall('/auth/register', 'POST', {
                name: form.name.value,
                email: form.email.value,
                password: form.password.value,
                role: form.role.value
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            state.token = data.token; state.user = data.user;
            showToast('Account created successfully!');
            window.location.hash = '#/dashboard';
        } catch (err) { 
            showToast(err.message, 'error'); 
            form.classList.add('shake-error');
            setTimeout(() => form.classList.remove('shake-error'), 500);
        }
    });
}

window.renderForgotPassword = async function(appDiv) {
    appDiv.innerHTML = `
        <div class="container section">
            <h2 class="text-center" style="margin-bottom:2rem; font-family:var(--font-heading);">Reset Password</h2>
            <form id="forgotForm" class="form-container">
                <p style="color:var(--text-secondary); font-size:0.95rem; margin-bottom:1.5rem; text-align:center; line-height:1.6;">
                    Enter your email address. If an account matches, we will send you a 6-digit verification code to reset your password.
                </p>
                <input type="email" id="email" placeholder="Email Address" required class="form-control">
                <button type="submit" class="btn btn-primary btn-block">Send Reset Code</button>
                <p class="text-center" style="margin-top:1.5rem;font-size:0.95rem; color:var(--text-secondary);">
                    Remembered it? <a href="#/login" style="font-weight:600;">Sign In</a>
                </p>
            </form>
        </div>
    `;

    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const emailVal = form.email.value;
        try {
            await apiCall('/auth/forgot-password', 'POST', { email: emailVal });
            showToast('Verification code sent to your email.');
            window.location.hash = `#/reset-password?email=${encodeURIComponent(emailVal)}`;
        } catch (err) {
            showToast(err.message, 'error');
            form.classList.add('shake-error');
            setTimeout(() => form.classList.remove('shake-error'), 500);
        }
    });
}

window.renderResetPassword = async function(appDiv) {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const emailParam = urlParams.get('email') || '';

    appDiv.innerHTML = `
        <div class="container section">
            <h2 class="text-center" style="margin-bottom:2rem; font-family:var(--font-heading);">Set New Password</h2>
            <form id="resetForm" class="form-container" style="max-width: 500px;">
                <input type="email" id="email" placeholder="Email Address" required class="form-control" value="${emailParam}">
                <input type="text" id="otp" placeholder="6-Digit Verification Code" required class="form-control" maxlength="6" style="text-align:center; font-weight:700; letter-spacing:4px;">
                
                <div style="position:relative; width:100%;">
                    <input type="password" id="password" placeholder="New Password" required class="form-control" style="padding-right: 3rem;">
                    <i id="togglePassword" class="fa-solid fa-eye" style="position:absolute; right:16px; top:16px; cursor:pointer; color:var(--text-secondary); font-size:1.1rem; transition:0.2s;"></i>
                </div>
                
                <!-- Password Strength Meter -->
                <div id="password-strength-container" style="margin-top:-0.5rem; margin-bottom:1.5rem; display:none; background:rgba(0,0,0,0.15); padding:1rem; border-radius:12px; border:1px solid var(--surface-border);">
                    <div class="strength-bar-bg" style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px; overflow:hidden; margin-bottom:0.6rem;">
                        <div id="strength-bar" style="height:100%; width:0%; transition:all 0.3s ease;"></div>
                    </div>
                    <div id="strength-text" style="font-size:0.85rem; font-weight:600; margin-bottom:0.6rem; color:var(--text-secondary);">Strength: Weak</div>
                    <ul class="strength-requirements" style="font-size:0.75rem; color:var(--text-secondary); padding-left:0; display:grid; grid-template-columns:1fr 1fr; gap:0.4rem; list-style:none;">
                        <li id="req-length" class="req-item" style="display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> 8+ Characters</li>
                        <li id="req-upper" class="req-item" style="display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> 1 Uppercase</li>
                        <li id="req-lower" class="req-item" style="display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> 1 Lowercase</li>
                        <li id="req-number" class="req-item" style="display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> 1 Number</li>
                        <li id="req-special" class="req-item" style="grid-column: span 2; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-circle-xmark" style="color:#ef4444;"></i> 1 Special Symbol (@$!%*?&)</li>
                    </ul>
                </div>

                <input type="password" id="confirmPassword" placeholder="Confirm New Password" required class="form-control">
                <div id="match-error" style="font-size:0.85rem; color:#ef4444; margin-top:-0.8rem; margin-bottom:1.2rem; display:none; font-weight:500;">
                    <i class="fa-solid fa-circle-exclamation"></i> Passwords do not match
                </div>

                <button type="submit" class="btn btn-primary btn-block" style="margin-top:1.5rem;">Update Password</button>
            </form>
        </div>
    `;

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const strengthContainer = document.getElementById('password-strength-container');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');
    const matchError = document.getElementById('match-error');
    
    const reqLength = document.getElementById('req-length');
    const reqUpper = document.getElementById('req-upper');
    const reqLower = document.getElementById('req-lower');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    const togglePassword = document.getElementById('togglePassword');
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.className = type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    });

    function updateReq(elem, isValid) {
        const icon = elem.querySelector('i');
        if (isValid) {
            icon.className = 'fa-solid fa-circle-check';
            icon.style.color = '#10b981';
            elem.style.color = '#10b981';
        } else {
            icon.className = 'fa-solid fa-circle-xmark';
            icon.style.color = '#ef4444';
            elem.style.color = 'var(--text-secondary)';
        }
    }

    function checkPassword() {
        const val = passwordInput.value;
        if (!val) {
            strengthContainer.style.display = 'none';
            return false;
        }
        strengthContainer.style.display = 'block';

        const hasLength = val.length >= 8;
        const hasUpper = /[A-Z]/.test(val);
        const hasLower = /[a-z]/.test(val);
        const hasNumber = /\d/.test(val);
        const hasSpecial = /[@$!%*?&]/.test(val);

        updateReq(reqLength, hasLength);
        updateReq(reqUpper, hasUpper);
        updateReq(reqLower, hasLower);
        updateReq(reqNumber, hasNumber);
        updateReq(reqSpecial, hasSpecial);

        const score = (hasLength ? 1 : 0) + (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);

        if (score <= 2) {
            strengthBar.style.width = '33%';
            strengthBar.style.background = '#ef4444';
            strengthText.innerText = 'Strength: Weak';
            strengthText.style.color = '#ef4444';
        } else if (score <= 4) {
            strengthBar.style.width = '66%';
            strengthBar.style.background = '#f59e0b';
            strengthText.innerText = 'Strength: Moderate';
            strengthText.style.color = '#f59e0b';
        } else {
            strengthBar.style.width = '100%';
            strengthBar.style.background = '#10b981';
            strengthText.innerText = 'Strength: Excellent (Strict)';
            strengthText.style.color = '#10b981';
        }

        return score === 5;
    }

    passwordInput.addEventListener('input', () => {
        checkPassword();
        checkMatch();
    });

    function checkMatch() {
        if (!confirmPasswordInput.value) {
            matchError.style.display = 'none';
            return false;
        }
        if (passwordInput.value !== confirmPasswordInput.value) {
            matchError.style.display = 'block';
            confirmPasswordInput.style.borderColor = '#ef4444';
            return false;
        } else {
            matchError.style.display = 'none';
            confirmPasswordInput.style.borderColor = '#10b981';
            return true;
        }
    }

    confirmPasswordInput.addEventListener('input', checkMatch);

    document.getElementById('resetForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        
        const isPassValid = checkPassword();
        const isMatchValid = checkMatch();
        
        if (!isPassValid) {
            showToast('Password is too weak. Please fulfill all security criteria.', 'error');
            form.classList.add('shake-error');
            setTimeout(() => form.classList.remove('shake-error'), 500);
            return;
        }
        
        if (!isMatchValid) {
            showToast('Passwords do not match.', 'error');
            form.classList.add('shake-error');
            setTimeout(() => form.classList.remove('shake-error'), 500);
            return;
        }

        try {
            const data = await apiCall('/auth/reset-password', 'POST', {
                email: form.email.value,
                otp: form.otp.value,
                newPassword: form.password.value
            });
            showToast(data.msg);
            window.location.hash = '#/login';
        } catch (err) {
            showToast(err.message, 'error');
            form.classList.add('shake-error');
            setTimeout(() => form.classList.remove('shake-error'), 500);
        }
    });
}
