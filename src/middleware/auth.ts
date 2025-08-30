import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";

// Extend Express Request interface to include user and token
export interface AuthenticatedRequest extends Request {
  user: any;
  token: string;
}

/**
 * Authentication middleware for Supabase JWT tokens
 * Verifies the Authorization header contains a valid JWT token
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    console.log("Auth header:", authHeader?.replace("Bearer ", ""));

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid authorization header",
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabase!.auth.getUser(token);

    console.log("User:", user);

    if (error || !user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
      return;
    }

    // Attach user information to the request object
    (req as AuthenticatedRequest).user = user;
    (req as AuthenticatedRequest).token = token;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication failed",
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const {
        data: { user },
        error,
      } = await supabase!.auth.getUser(token);

      if (!error && user) {
        (req as AuthenticatedRequest).user = user;
        (req as AuthenticatedRequest).token = token;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
