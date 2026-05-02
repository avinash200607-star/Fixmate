const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Authentication token is missing." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("CRITICAL: JWT_SECRET environment variable is not set");
      return res.status(500).json({ message: "Server configuration error" });
    }
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // Contains id and role
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
    return res.status(401).json({ message: "Invalid authentication token." });
  }
};
