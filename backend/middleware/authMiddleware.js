// backend/middleware/authMiddleware.js
function ensureAuth(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ error: "Unauthorized. Please log in." });
}

module.exports = { ensureAuth };
