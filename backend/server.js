/* backend/server.js - docker-safe */

const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Docker-safe .env loading

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

app.set('trust proxy', 1);

/* ---------- SECURITY ---------- */

app.use(
  helmet({
    hsts: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"]
      }
    }
  })
);

/* ---------- DATABASE ---------- */

connectMongoDB();

/* ---------- EXPRESS ---------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cookieSecure =
  process.env.USE_HTTPS === 'true' && process.env.NODE_ENV === 'production';

const sessionCookie = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000
};

/* ---------- SESSION ---------- */

async function createSessionMiddleware() {

  console.log(
    'ENV DEBUG ->',
    'MONGO_URI:', !!process.env.MONGO_URI,
    'MYSQL_HOST:', process.env.MYSQL_HOST,
    'SESSION_SECRET:', !!process.env.SESSION_SECRET
  );

  return session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions'
    }),
    cookie: sessionCookie
  });
}

/* ---------- VIEW HELPER ---------- */

function sendView(res, ...segments) {
  const file = path.resolve(__dirname, '..', ...segments);

  if (!fs.existsSync(file)) {
    console.error("Missing view:", file);
    return res.status(500).send("View missing");
  }

  res.sendFile(file);
}

/* ---------- START APP ---------- */

createSessionMiddleware()
  .then(sessionMw => {

    app.use(sessionMw);

    require('./config/passport')(passport);

    app.use(passport.initialize());
    app.use(passport.session());

    /* ---------- STATIC ---------- */

    app.use(express.static(path.join(__dirname, '../frontend')));

    /* ---------- RATE LIMIT ---------- */

    app.use(
      '/api/chat',
      rateLimit({
        windowMs: 60 * 1000,
        max: 30
      })
    );

    /* ---------- ROUTES ---------- */

    app.use('/auth', authRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/user', userRoutes);

    app.get('/signup', (req, res) =>
      sendView(res, 'frontend', 'views', 'signup.html')
    );

    app.get('/login', (req, res) =>
      sendView(res, 'frontend', 'views', 'login.html')
    );

    app.get('/profile', ensureAuth, (req, res) =>
      sendView(res, 'frontend', 'views', 'profile.html')
    );

    app.get('/chat', ensureAuth, (req, res) =>
      sendView(res, 'frontend', 'views', 'chat.html')
    );

    app.get('/', (req, res) =>
      sendView(res, 'frontend', 'views', 'index.html')
    );

    /* ---------- HEALTH CHECK ---------- */

    app.get('/health/mysql', (req, res) => {

      sql.query('SELECT 1', (err, rows) => {

        if (err) return res.status(500).json({ error: err.code });

        res.json({ ok: rows[0]['1'] });
      });

    });

    app.get('/health/mongo', (req, res) => {

      res.json({
        state: mongoose.connection.readyState
      });

    });

    /* ---------- FALLBACK ---------- */

    app.use((req, res) =>
      res.status(404).json({ error: 'Not found' })
    );

    app.use((err, req, res, next) => {

      console.error(err);

      res.status(500).json({ error: 'Server error' });

    });

    /* ---------- START SERVER ---------- */

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  })
  .catch(err => {

    console.error("Session init failed:", err);

    process.exit(1);

  });