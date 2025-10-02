// frontend/assets/js/login.js
document.addEventListener('DOMContentLoaded', () => {
  const googleBtn = document.getElementById('googleBtn');
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('msg');

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      location.href = '/auth/google';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!msg) return;

      msg.textContent = '';
      msg.className = '';

      const body = {
        username: e.target.username.value.trim(),
        password: e.target.password.value
      };

      if (!body.username || !body.password) {
        msg.textContent = 'Username and password are required.';
        msg.className = 'err';
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in…';
      }

      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // keep the session cookie
          body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) {
          msg.textContent = data.error || 'Login failed';
          msg.className = 'err';
          return;
        }

        msg.textContent = 'Login successful! Redirecting…';
        msg.className = 'ok';
        setTimeout(() => (location.href = '/chat'), 600);
      } catch (err) {
        msg.textContent = 'Network error';
        msg.className = 'err';
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Log in';
        }
      }
    });
  }
});
