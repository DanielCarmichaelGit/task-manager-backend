import express, { Application, Request, Response, NextFunction } from "express";

import dotenv from "dotenv";
import { setupSecurityMiddleware } from "./middleware/security";
import { HealthResponse } from "./types";

dotenv.config();

const app: Application = express();

// Add request logging middleware
app.use((req: Request, res: Response, next: NextFunction): void => {
  next();
});

// Find an available port
const findAvailablePort = (startPort: number): Promise<number> => {
  return new Promise((resolve) => {
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

let PORT: number = parseInt(process.env["PORT"] || "3000");

// Setup security middleware
setupSecurityMiddleware(app);

// Health check endpoint
app.get("/health", (_req: Request, res: Response): void => {
  const response: HealthResponse = {
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env["NODE_ENV"] || "development",
  };
  res.json(response);
});

// Only load routes if Supabase is configured
import authRoutes from "./routes/auth";
import taskRoutes from "./routes/tasks";

// API routes (only if Supabase is configured)
if (authRoutes && taskRoutes) {
  console.log("🔗 Mounting /api/auth routes...");
  app.use("/api/auth", authRoutes);
  console.log("🔗 Mounting /api/tasks routes...");
  app.use("/api/tasks", taskRoutes);
  console.log("✅ All API routes mounted successfully");
} else {
  console.warn("⚠️  No routes to mount - setting up fallback");
  app.get("/api/*", (req: Request, res: Response): void => {
    console.log(`🚫 API route not found: ${req.originalUrl}`);
    res.status(503).json({
      error: "Service Unavailable",
      message:
        "Supabase not configured. Please set environment variables and restart the server.",
    });
  });
}

// Root endpoint
app.get("/", (_req: Request, res: Response): void => {
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
app.use("*", (req: Request, res: Response): void => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(
  (error: any, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("Global error handler:", error);

    // Handle CORS errors
    if (error.message === "Not allowed by CORS") {
      res.status(403).json({
        error: "Forbidden",
        message: "CORS policy violation",
      });
      return;
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      res.status(400).json({
        error: "Validation Error",
        message: error.message,
      });
      return;
    }

    // Handle JWT errors
    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token",
      });
      return;
    }

    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        error: "Unauthorized",
        message: "Token expired",
      });
      return;
    }

    // Default error response
    res.status(500).json({
      error: "Internal Server Error",
      message:
        process.env["NODE_ENV"] === "production"
          ? "Something went wrong"
          : error.message,
    });
  }
);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Find available port if the default is busy
    if (process.env["NODE_ENV"] !== "production") {
      PORT = await findAvailablePort(PORT);
    }

    app.listen(PORT, (): void => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(
        `📊 Environment: ${process.env["NODE_ENV"] || "development"}`
      );
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
process.on("SIGTERM", (): void => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", (): void => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

export default app;
