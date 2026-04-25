const Profile = require('../models/Profile');

/**
 * Ensures the user has a valid access token, refreshing it if necessary.
 */
const getValidToken = async (userId) => {
  const profile = await Profile.findOne({ userId });
  if (!profile || !profile.stravaTokens) return null;

  const { accessToken, refreshToken, expiresAt } = profile.stravaTokens;

  // Check if token is expired (with 5-min buffer)
  if (Date.now() / 1000 > expiresAt - 300) {
    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) throw new Error("Token refresh failed");
      
      const data = await response.json();
      
      profile.stravaTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Strava may not always return a new refresh token
        expiresAt: data.expires_at
      };
      
      await profile.save();
      return data.access_token;
    } catch (err) {
      console.error("Error refreshing Strava token:", err);
      return null;
    }
  }
  
  return accessToken;
};

const getLatestActivity = async (userId) => {
  const token = await getValidToken(userId); // Now using the refresh-aware helper
  if (!token) return null;

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data[0];
  } catch (err) {
    console.error("Error fetching Strava activity:", err);
    return null;
  }
};

module.exports = { getLatestActivity };