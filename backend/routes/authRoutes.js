// backend/routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const sql = require('../config/dbSQL');
const Profile = require('../models/Profile');

const router = express.Router();

/* ---------- Helpers ---------- */
function regenAndLogin(req, user, onSuccess, onError) {
  req.session.regenerate((err) => {
    if (err) return onError(err);
    req.login(user, (err2) => {
      if (err2) return onError(err2);
      return onSuccess();
    });
  });
}

/* ---------- Local signup ---------- */
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username & password required' });
    }
    const hash = await bcrypt.hash(password, 12);

    sql.execute(
      'INSERT INTO users (username, email, password_hash) VALUES (?,?,?)',
      [username, email || null, hash],
      (err, r) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Username/email already exists' });
          }
          console.error(err);
          return res.status(500).json({ error: 'Signup failed' });
        }

        const user = { id: r.insertId, username };
        regenAndLogin(
          req,
          user,
          () => res.json({ message: 'Signup successful', userId: r.insertId }),
          () => res.status(500).json({ error: 'Session error' })
        );
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Signup failed' });
  }
});

/* ---------- Local login ---------- */
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    regenAndLogin(
      req,
      user,
      () => res.json({ message: 'Login successful', user }),
      (e) => next(e)
    );
  })(req, res, next);
});

/* ---------- Google OAuth ---------- */
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res, next) => {
    // session fixation protection
    req.session.regenerate(async (err) => {
      if (err) return next(err);
      req.login(req.user, async (err2) => {
        if (err2) return next(err2);
        try {
          const existing = await Profile.findOne({ userId: req.user.id });
          return res.redirect(existing ? '/chat' : '/profile');
        } catch (e) {
          return next(e);
        }
      });
    });
  }
);

/* ---------- Logout (POST) ---------- */
router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ message: 'Logged out' }));
  });
});

/* ---------- Who am I (debug) ---------- */
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user: req.user });
});

module.exports = router;
