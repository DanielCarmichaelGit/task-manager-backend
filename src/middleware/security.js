const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const express = require("express");

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: "Too Many Requests",
      message: message || "Rate limit exceeded, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General API rate limiter
const apiLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  "Too many requests from this IP, please try again later."
);

// Stricter rate limiter for auth endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per 15 minutes
  "Too many authentication attempts, please try again later."
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000", "http://localhost:3001"];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Security middleware setup
const setupSecurityMiddleware = (app) => {
  // Basic security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    })
  );

  // CORS
  app.use(cors(corsOptions));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Rate limiting
  app.use("/api/", apiLimiter);
  app.use("/api/auth/", authLimiter);
};

module.exports = {
  setupSecurityMiddleware,
  apiLimiter,
  authLimiter,
};
