const jwt = require("jsonwebtoken");
function authenticateToken(req, res, next) {
  const authHeader = req.header("Authorization") || "";
  const token = authHeader.split(" ")[1] || null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { authenticateToken };
