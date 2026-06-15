document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/dashboard.html';
        return;
    }

    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');

    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.style.display = 'none';
        registerSection.style.display = 'block';
        loginError.innerText = '';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.style.display = 'none';
        loginSection.style.display = 'block';
        registerError.innerText = '';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.innerText = '';
        
        const usernameInput = document.getElementById('login-username').value;
        const passwordInput = document.getElementById('login-password').value;

        // Determine if input is email or username
        const payload = { password: passwordInput };
        if (usernameInput.includes('@')) {
            payload.email = usernameInput;
        } else {
            payload.username = usernameInput;
        }

        try {
            loginBtn.disabled = true;
            loginBtn.innerText = 'Logging in...';

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Login failed');
            }

            localStorage.setItem('token', data.token);
            window.location.href = '/dashboard.html';

        } catch (error) {
            loginError.innerText = error.message;
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerText = 'Login';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerError.innerText = '';

        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;

        try {
            registerBtn.disabled = true;
            registerBtn.innerText = 'Creating Account...';

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, confirmPassword })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Registration success, switch to login
            registerSection.style.display = 'none';
            loginSection.style.display = 'block';
            document.getElementById('login-username').value = username;
            loginError.innerText = 'Registration successful! Please login.';
            loginError.style.color = 'green';
            
        } catch (error) {
            registerError.innerText = error.message;
            registerError.style.color = 'red';
        } finally {
            registerBtn.disabled = false;
            registerBtn.innerText = 'Register';
        }
    });
});
