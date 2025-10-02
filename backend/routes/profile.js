// backend/routes/profile.js
const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../middleware/authMiddleware");
const Profile = require("../models/Profile");

function normalizeAllergies(allergies) {
  if (!allergies) return [];
  if (Array.isArray(allergies)) return allergies.filter(Boolean);
  return [allergies].filter(Boolean);
}

router.put("/health", ensureAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { age, gender, height, weight, dietaryPreferences, allergies, goals } = req.body;

    const doc = await Profile.findOneAndUpdate(
      { userId },
      {
        userId,
        age,
        gender,
        height,
        weight,
        dietaryPreferences,
        allergies: normalizeAllergies(allergies),
        goals,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: "Health profile updated successfully", healthProfile: doc });
  } catch (error) {
    console.error("Error updating health profile:", error);
    res.status(500).json({ error: "Failed to update health profile" });
  }
});

router.get("/health", ensureAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const doc = await Profile.findOne({ userId });
    res.json(doc || {});
  } catch (error) {
    console.error("Error fetching health profile:", error);
    res.status(500).json({ error: "Failed to get health profile" });
  }
});

module.exports = router;
