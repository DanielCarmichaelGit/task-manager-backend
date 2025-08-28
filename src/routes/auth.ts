import express, { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { authenticateUser, AuthenticatedRequest } from "../middleware/auth";
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  UpdateProfileRequest,
} from "../types";

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  async (
    req: Request<{}, {}, RegisterRequest>,
    res: Response
  ): Promise<void> => {
    try {
      const { email, password, user_metadata = {} } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: "Bad Request",
          message: "Email and password are required",
        });
        return;
      }

      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: {
          data: user_metadata,
        },
      });

      if (error) {
        res.status(400).json({
          error: "Registration Failed",
          message: error.message,
        });
        return;
      }

      res.status(201).json({
        message: "User registered successfully",
        user: data.user,
        session: data.session,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to register user",
      });
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  "/login",
  async (req: Request<{}, {}, LoginRequest>, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: "Bad Request",
          message: "Email and password are required",
        });
        return;
      }

      const { data, error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        res.status(401).json({
          error: "Authentication Failed",
          message: error.message,
        });
        return;
      }

      res.json({
        message: "Login successful",
        user: data.user,
        session: data.session,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to authenticate user",
      });
    }
  }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  "/logout",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { error } = await supabase!.auth.signOut();

      if (error) {
        res.status(400).json({
          error: "Logout Failed",
          message: error.message,
        });
        return;
      }

      res.json({
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to logout user",
      });
    }
  }
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get(
  "/profile",
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      res.json({
        user: req.user,
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch user profile",
      });
    }
  }
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  authenticateUser,
  async (
    req: Request<{}, {}, UpdateProfileRequest>,
    res: Response
  ): Promise<void> => {
    try {
      const { user_metadata } = req.body;

      const { data, error } = await supabase!.auth.updateUser({
        data: user_metadata,
      });

      if (error) {
        res.status(400).json({
          error: "Update Failed",
          message: error.message,
        });
        return;
      }

      res.json({
        message: "Profile updated successfully",
        user: data.user,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update user profile",
      });
    }
  }
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  "/refresh",
  async (
    req: Request<{}, {}, RefreshTokenRequest>,
    res: Response
  ): Promise<void> => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        res.status(400).json({
          error: "Bad Request",
          message: "Refresh token is required",
        });
        return;
      }

      const { data, error } = await supabase!.auth.refreshSession({
        refresh_token,
      });

      if (error) {
        res.status(401).json({
          error: "Token Refresh Failed",
          message: error.message,
        });
        return;
      }

      res.json({
        message: "Token refreshed successfully",
        session: data.session,
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to refresh token",
      });
    }
  }
);

export default router;
