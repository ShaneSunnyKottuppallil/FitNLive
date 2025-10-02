// frontend/assets/js/signup.js
document.addEventListener('DOMContentLoaded', () => {
  const googleBtn = document.getElementById('googleBtn');
  const form = document.getElementById('signupForm');
  const msg = document.getElementById('msg');

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      // start OAuth flow
      location.href = '/auth/google';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!msg) return;

      msg.textContent = '';
      msg.className = '';

      const username = e.target.username.value.trim();
      const email = (e.target.email.value || '').trim();
      const password = e.target.password.value;

      if (!username || !password) {
        msg.textContent = 'Username and password are required.';
        msg.className = 'err';
        return;
      }

      // Client-side password rule: at least 8 chars and at least one number
      const passwordPattern = /^(?=.*\d).{8,}$/;
      if (!passwordPattern.test(password)) {
        msg.textContent = 'Password must be at least 8 characters and include at least one number.';
        msg.className = 'err';
        return;
      }

      const body = { username, email, password };

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating…';
      }

      try {
        const res = await fetch('/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // keep session cookie
          body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) {
          msg.textContent = data.error || 'Signup failed';
          msg.className = 'err';
          return;
        }

        msg.textContent = 'Signup successful! Redirecting…';
        msg.className = 'ok';
        setTimeout(() => (location.href = '/profile'), 600);
      } catch (err) {
        msg.textContent = 'Network error';
        msg.className = 'err';
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create account';
        }
      }
    });
  }
});
