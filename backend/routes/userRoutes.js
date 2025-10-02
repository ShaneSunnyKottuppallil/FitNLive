//userRoutes.js
const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../middleware/authMiddleware");
const User = require("../models/User");

// Update health profile
router.put("/profile", ensureAuth, async (req, res) => {
    try {
        const { age, gender, height, weight, dietaryPreferences, allergies, goals } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    healthProfile: {
                        age,
                        gender,
                        height,
                        weight,
                        dietaryPreferences,
                        allergies,
                        goals
                    }
                }
            },
            { new: true }
        );

        res.json(updatedUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// Get health profile
router.get("/profile", ensureAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json(user.healthProfile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

module.exports = router;
