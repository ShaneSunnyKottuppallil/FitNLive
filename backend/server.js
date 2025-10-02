// backend/server.js
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

app.use(helmet());
app.set('trust proxy', 1);

connectMongoDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, '../frontend')));

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
// app.get('/', (_req, res) => res.send('Home Page - Physical Health Chatbot'));
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



// ---- Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
