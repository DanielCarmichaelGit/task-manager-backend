const { supabase } = require("../config/supabase");

/**
 * Authentication middleware for Supabase JWT tokens
 * Verifies the Authorization header contains a valid JWT token
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    // Attach user information to the request object
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication failed",
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (!error && user) {
        req.user = user;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateUser,
  optionalAuth,
};
