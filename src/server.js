const express = require("express");
const path = require("path");
require("dotenv").config();

const { setupSecurityMiddleware } = require("./middleware/security");

// Only load routes if Supabase is configured
let authRoutes, taskRoutes;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    authRoutes = require("./routes/auth");
    taskRoutes = require("./routes/tasks");
    console.log("✅ Supabase configured - auth and task routes enabled");
  } else {
    console.warn("⚠️  Supabase not configured - auth and task routes disabled");
    console.warn("   Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file");
  }
} catch (error) {
  console.warn("⚠️  Failed to load routes:", error.message);
  console.warn("   Make sure Supabase is properly configured");
}

const app = express();

// Find an available port
const findAvailablePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const server = require("net").createServer();
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
};

let PORT = process.env.PORT || 3000;

// Setup security middleware
setupSecurityMiddleware(app);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes (only if Supabase is configured)
if (authRoutes && taskRoutes) {
  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", taskRoutes);
} else {
  app.get("/api/*", (req, res) => {
    res.status(503).json({
      error: "Service Unavailable",
      message:
        "Supabase not configured. Please set environment variables and restart the server.",
    });
  });
}

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Task Manager Backend API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      tasks: "/api/tasks",
      health: "/health",
    },
  });
});

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  // Handle CORS errors
  if (error.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "Forbidden",
      message: "CORS policy violation",
    });
  }

  // Handle validation errors
  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      message: error.message,
    });
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid token",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Token expired",
    });
  }

  // Default error response
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message,
  });
});

// Start server
const startServer = async () => {
  try {
    // Find available port if the default is busy
    if (process.env.NODE_ENV !== "production") {
      PORT = await findAvailablePort(PORT);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

module.exports = app;
