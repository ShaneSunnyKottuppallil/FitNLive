// backend/config/passport.js
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const sql = require('./dbSQL'); // mysql2 connection (createConnection)

module.exports = function (passport) {
  /* ========== Local: username + password ========== */
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        sql.execute(
          'SELECT * FROM users WHERE username = ? LIMIT 1',
          [username],
          async (err, rows) => {
            if (err) return done(err);
            const user = rows?.[0];
            if (!user || !user.password_hash) {
              return done(null, false, { message: 'Invalid credentials' });
            }
            const ok = await bcrypt.compare(password, user.password_hash);
            if (!ok) return done(null, false, { message: 'Invalid credentials' });

            // Minimal user object for session
            return done(null, { id: user.id, username: user.username });
          }
        );
      } catch (e) {
        return done(e);
      }
    })
  );

  /* ========== Google OAuth ========== */
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Prefer absolute callback when you have a BASE_URL; fallback to relative
        callbackURL: process.env.BASE_URL
          ? `${process.env.BASE_URL}/auth/google/callback`
          : '/auth/google/callback',
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value || null;
          const suggested =
            (profile.displayName || `user_${googleId}`)
              .replace(/\s+/g, '')
              .toLowerCase()
              .slice(0, 20) || `user_${googleId}`;

          // Try to find by google_id OR email (account linking)
          sql.execute(
            'SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1',
            [googleId, email],
            (err, rows) => {
              if (err) return done(err);
              if (rows && rows[0]) {
                const u = rows[0];
                return done(null, { id: u.id, username: u.username });
              }

              // Create new linked user
              sql.execute(
                'INSERT INTO users (username, email, google_id) VALUES (?, ?, ?)',
                [suggested, email, googleId],
                (err2, result) => {
                  if (err2) return done(err2);
                  return done(null, { id: result.insertId, username: suggested });
                }
              );
            }
          );
        } catch (e) {
          return done(e);
        }
      }
    )
  );

  /* ========== Sessions ========== */
  // Store minimal info in session
  passport.serializeUser((user, done) => {
    // user: { id, username }
    done(null, user);
  });

  // We stored the minimal object; no DB fetch needed on each request
  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });
};
