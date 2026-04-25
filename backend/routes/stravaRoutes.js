const express = require("express");
const router = express.Router();
const Profile = require("../models/Profile");
const { getLatestActivity } = require("../services/stravaService"); // Added missing import
const { ensureAuth } = require("../middleware/authMiddleware");


router.get('/callback', ensureAuth, async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    // Use native fetch instead of axios
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();

    await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { 
        stravaTokens: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at
        }
      },
      { upsert: true }
    );

    res.redirect('/chat?strava=success');
  } catch (err) {
    console.error("Strava Callback Error:", err);
    res.status(500).send("Authentication failed");
  }
});


router.get('/auth-url', (req, res) => {
  const url = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.STRAVA_REDIRECT_URI}&scope=activity:read_all`;
  res.json({ url });
});

router.get('/status', ensureAuth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });
    const isConnected = !!(profile && profile.stravaTokens && profile.stravaTokens.accessToken);
    res.json({ connected: isConnected });
  } catch (err) {
    res.status(500).json({ error: "Failed to check status" });
  }
});

router.get('/latest-activity', ensureAuth, async (req, res) => {
  try {
    const activity = await getLatestActivity(req.user.id);
    if (!activity) {
      // If this returns 404, the frontend will see "No activities found"
      return res.status(404).json({ error: "No activities found" });
    }
    res.json(activity);
  } catch (err) {
    console.error("Latest activity error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router; // <--- MAKE SURE THIS IS HERE