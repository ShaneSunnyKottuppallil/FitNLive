// backend/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { ensureAuth } = require("../middleware/authMiddleware");
const { getGeminiResponse } = require("../services/geminiService.js");
const Chat = require("../models/Chat");

/** Create a new session id */
router.post("/session", ensureAuth, async (_req, res) => {
  try {
    return res.json({ sessionId: uuidv4() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create session" });
  }
});

/** Send a message */
router.post("/", ensureAuth, async (req, res) => {
  try {
    let { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    if (!sessionId) sessionId = uuidv4();

    const reply = await getGeminiResponse(req.user.id, message);

    const chat = await Chat.create({
      userId: req.user.id,   // 👈 MySQL user id
      sessionId,
      message,
      reply,
    });

    res.json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get response from Gemini" });
  }
});

/** Recent messages (last 20) across all sessions */
router.get("/history", ensureAuth, async (req, res) => {
  try {
    const history = await Chat.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(20);
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get chat history" });
  }
});

/** List sessions (newest first) */
router.get("/sessions", ensureAuth, async (req, res) => {
  try {
    const sessions = await Chat.aggregate([
      { $match: { userId: req.user.id } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$sessionId",
          lastTimestamp: { $first: "$timestamp" },
          lastMessage: { $first: "$message" },
        },
      },
      { $sort: { lastTimestamp: -1 } },
    ]);

    const safe = (s) => (s && typeof s === "string" ? s : (s ?? "").toString());

    res.json(
      sessions.map((s) => {
        const msg = safe(s.lastMessage);
        return {
          sessionId: s._id,
          lastTimestamp: s.lastTimestamp,
          snippet: msg.length > 60 ? msg.slice(0, 60).trim() + "..." : msg,
        };
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get chat sessions" });
  }
});

/** Get all messages in a session (oldest first) */
router.get("/session/:sessionId", ensureAuth, async (req, res) => {
  try {
    const chats = await Chat.find({
      userId: req.user.id,
      sessionId: req.params.sessionId,
    }).sort({ timestamp: 1 });

    res.json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get chat session messages" });
  }
});

module.exports = router;
