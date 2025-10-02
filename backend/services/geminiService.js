// backend/services/geminiService.js
const Profile = require("../models/Profile");
const Chat = require("../models/Chat");

/* ========= System prompt ========= */
const SYSTEM_PROMPT = `
You are a professional physical health and fitness assistant.
Your role is to give safe, medically cautious, and personalized guidance 
related to:
- Physical exercise
- Weight management
- Calorie tracking
- Healthy diet planning
- Hydration and nutrition tips
- Sleep and recovery advice
- Progress tracking

Rules:
- Should only answer queries related to health and monitoring them.
- If needed ask users for details to calculate diet but don't give inappropriate data.
- Never give unsafe or extreme recommendations.
- No one line gap after each paragraph.
- Responses should include points.
- If asked for medical diagnosis, politely advise seeing a doctor.
- Responses should contain at least 20 words.
- If giving diet/exercise plans, ensure they are beginner-friendly unless user specifies otherwise.
`;

/**
 * Turn stored chat docs into Gemini chat history (oldest -> newest)
 */
function buildGeminiHistory({ docs = [], profileContext = "" }) {
  const history = [];

  if (profileContext) {
    history.push({
      role: "user",
      parts: [{ text: profileContext }],
    });
  }

  for (const d of docs) {
    if (d?.message) history.push({ role: "user", parts: [{ text: d.message }] });
    if (d?.reply)   history.push({ role: "model", parts: [{ text: d.reply }] });
  }

  return history;
}

/**
 * Get Gemini response with profile & prior session messages
 * @param {number|string} userId
 * @param {string} userPrompt
 * @param {string} sessionId
 */
async function getGeminiResponse(userId, userPrompt, sessionId) {
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT, // supported on recent SDKs
    });

    // Pull profile
    const p = await Profile.findOne({ userId: Number(userId) }).lean();
    const profileContext = p
      ? [
          "User Health Profile:",
          `- Age: ${p.age ?? "N/A"}`,
          `- Gender: ${p.gender ?? "N/A"}`,
          `- Height: ${p.height ?? "N/A"} cm`,
          `- Weight: ${p.weight ?? "N/A"} kg`,
          `- Dietary Preferences: ${p.dietaryPreferences || "None"}`,
          `- Allergies: ${(p.allergies || []).join(", ") || "None"}`,
          `- Goals: ${p.goals || "None"}`,
          "",
          "Use this profile for personalization.",
        ].join("\n")
      : "No saved health profile. If useful, ask for age, gender, height, weight, allergies, dietary preferences, and goals.";

    // Pull previous turns for this session
    const prior = await Chat.find({ userId: Number(userId), sessionId })
      .sort({ timestamp: 1 })
      .lean();

    const MAX_TURNS = 24; // user+model turns (last ~12 exchanges)
    const trimmed = prior.slice(-MAX_TURNS);

    const history = buildGeminiHistory({ docs: trimmed, profileContext });

    // Start a chat with existing history
    const chat = model.startChat({
      history,
      generationConfig: { temperature: 0.7 },
    });

    // Timeout guard
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);

    // ✅ IMPORTANT: pass the prompt as a STRING; options (like signal) go in arg #2
    let resp = await chat.sendMessage(userPrompt, { signal: ctrl.signal });

    clearTimeout(t);

    let text =
      (resp?.response && typeof resp.response.text === "function"
        ? resp.response.text()
        : "") || "";

    // Fallback path if text is unexpectedly empty
    if (!text) {
      const fallback = await model.generateContent(
        [
          { role: "user", parts: [{ text: profileContext }] },
          ...history, // already includes profile but harmless to include; remove if you prefer
          { role: "user", parts: [{ text: userPrompt }] },
        ],
        { signal: ctrl.signal }
      );
      text =
        (fallback?.response && typeof fallback.response.text === "function"
          ? fallback.response.text()
          : "") || "Sorry, I couldn’t generate a response.";
    }

    return text;
  } catch (error) {
    if (error?.name === "AbortError") {
      return "The request took too long and was canceled. Please try again.";
    }
    console.error("Gemini API Error:", error?.response?.data || error?.message || error);
    throw new Error("Failed to get a response from Gemini API");
  }
}

module.exports = { getGeminiResponse };
