// backend/models/Profile.js
const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  userId: {
    type: Number, // MySQL user id
    required: true,
    unique: true,
    index: true
  },
  age: { type: Number, min: 0 },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  height: { type: Number, min: 0 }, // cm
  weight: { type: Number, min: 0 }, // kg
  dietaryPreferences: { type: String, trim: true },
  allergies: { type: [String], default: [] },
  goals: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model("Profile", profileSchema);
