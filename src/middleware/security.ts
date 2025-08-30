import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import express, { Application } from "express";

// Rate limiting configuration
const createRateLimiter = (windowMs: number, max: number, message?: string) => {
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
  parseInt(process.env["RATE_LIMIT_WINDOW_MS"] || "900000"), // 15 minutes
  parseInt(process.env["RATE_LIMIT_MAX_REQUESTS"] || "100"),
  "Too many requests from this IP, please try again later."
);

// Stricter rate limiter for auth endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per 15 minutes
  "Too many authentication attempts, please try again later."
);

// Security middleware setup
export const setupSecurityMiddleware = (app: Application): void => {
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

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Rate limiting
  app.use("/api/", apiLimiter);
  app.use("/api/auth/", authLimiter);
};

export { apiLimiter, authLimiter };
