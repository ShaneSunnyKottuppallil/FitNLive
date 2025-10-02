const mongoose = require("mongoose");

// Sub-schema for the user's health profile
const healthProfileSchema = new mongoose.Schema({
    age: { type: Number, min: 0 },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    height: { type: Number, min: 0 }, // in cm
    weight: { type: Number, min: 0 }, // in kg
    dietaryPreferences: { type: String, trim: true }, // e.g. vegetarian, vegan, keto
    allergies: { type: [String], default: [] }, // e.g. ["nuts", "gluten"]
    goals: { type: String, trim: true } // e.g. "Lose weight", "Build muscle"
}, { _id: false });

const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
    },
    displayName: {
        type: String,
        required: true,
    },
    firstName: String,
    lastName: String,
    image: String,
    healthProfile: healthProfileSchema
}, { timestamps: true }); // adds createdAt and updatedAt

module.exports = mongoose.model("User", userSchema);
