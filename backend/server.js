/* backend/server.js - patched */
/* robust session middleware using connect-mongo; helmet configured once (no HSTS / no upgrade-insecure-requests) */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const session = require('express-session');
const passport = require('passport');

const connectMongoDB = require('./config/dbMongo');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profile');
const { ensureAuth } = require('./middleware/authMiddleware');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const sql = require('./config/dbSQL');

const app = express();

// Helmet configured to NOT send HSTS and to avoid upgrade-insecure-requests
const helmetOptions = {
  // Turn off HSTS header from Helmet (we don't want Strict-Transport-Security)
  hsts: false,

  // Configure Content-Security-Policy manually and do NOT include
  // the upgrade-insecure-requests directive which forces https.
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "font-src": ["'self'", "https:", "data:"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'self'"],
      "img-src": ["'self'", "data:"],
      "object-src": ["'none'"],
      "script-src": ["'self'"],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'", "https:", "'unsafe-inline'"]
      // NOTE: intentionally not adding "upgrade-insecure-requests"
    }
  },

  // keep other sensible defaults enabled
};

app.use(helmet(helmetOptions));


connectMongoDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -- Robust session middleware creation (async)
async function createSessionMiddleware() {
  // debug - log presence of important envs (will show in pm2 logs)
  console.log('ENV DEBUG -> MONGO_URI:', !!process.env.MONGO_URI, 'SESSION_SECRET:', !!process.env.SESSION_SECRET);

  // If MONGO_URI is provided, use it directly (fast path)
  if (process.env.MONGO_URI) {
    return session({
      secret: process.env.SESSION_SECRET || 'change_me',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      }
    });
  }

  // Otherwise wait for mongoose to connect then use the native client
  if (mongoose.connection.readyState !== 1) {
    console.log('Waiting for mongoose connection to be ready before creating session store...');
    await mongoose.connection.asPromise(); // resolves when connected
  }

  // try to obtain the native MongoClient from mongoose
  const client = (typeof mongoose.connection.getClient === 'function')
    ? mongoose.connection.getClient()
    : (mongoose.connections && mongoose.connections[0] && mongoose.connections[0].client);

  if (!client) {
    console.error('No Mongo client available for session store. Please set MONGO_URI or ensure mongoose.connect succeeded.');
    throw new Error('No Mongo client available for session store');
  }

  const clientPromise = Promise.resolve(client);

  return session({
    secret: process.env.SESSION_SECRET || 'change_me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      clientPromise,
      collectionName: 'sessions'
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    }
  });
}

// Mount session middleware then initialize passport and mount routes.
// We do this inside the .then() to ensure session middleware is present
// before passport.session() (passport depends on express-session).
createSessionMiddleware()
  .then((sessionMw) => {
    app.use(sessionMw);

    // Passport (must be after session)
    require('./config/passport')(passport);
    app.use(passport.initialize());
    app.use(passport.session());

    // optional debug route to confirm envs (remove after debugging)
    app.get('/debug/env', (_req, res) => {
      res.json({
        MONGO_URI: !!process.env.MONGO_URI,
        SESSION_SECRET: !!process.env.SESSION_SECRET,
        MYSQL_PASSWORD: !!process.env.MYSQL_PASSWORD || !!process.env.MYSQL_PASS,
        NODE_ENV: process.env.NODE_ENV || null
      });
    });

    // static assets
    app.use(express.static(path.join(__dirname, '../frontend')));

    // rate-limited API path
    app.use('/api/chat', rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30
    }));

    // ---- Routes
    app.use('/auth', authRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/user', userRoutes);

    // ---- Page routes
    app.get('/signup', (_req, res) =>
      res.sendFile(path.join(__dirname, '../frontend/views/signup.html'))
    );
    app.get('/login', (_req, res) =>
      res.sendFile(path.join(__dirname, '../frontend/views/login.html'))
    );
    app.get('/profile', ensureAuth, (req, res) =>
      res.sendFile(path.join(__dirname, '../frontend/views/profile.html'))
    );
    app.get('/chat', ensureAuth, (req, res) =>
      res.sendFile(path.join(__dirname, '../frontend/views/chat.html'))
    );
    app.get('/', (_req, res) =>
      res.sendFile(path.join(__dirname, '../frontend/views/index.html'))
    );

    // ---- Temporary health endpoints (remove in production)
    app.get('/health/mysql', (_req, res) => {
      sql.query('SELECT 1 AS ok', (e, rows) =>
        res.status(e ? 500 : 200).json(e ? { e: e.code } : { ok: rows[0].ok })
      );
    });
    app.get('/health/mongo', (_req, res) => {
      res.json({ state: mongoose.connection.readyState }); // 1 = connected
    });
    app.get('/health/session', (req, res) => {
      res.json({ hasSession: !!req.session, isAuthed: !!req.user, user: req.user || null });
    });

    // ---- Fallbacks & error handler
    app.use((req, res) => res.status(404).json({ error: 'Not found' }));
    app.use((err, _req, res, _next) => {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    });

    // ---- Start listening
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to create session middleware:', err);
    // fail fast rather than running without sessions
    process.exit(1);
  });
