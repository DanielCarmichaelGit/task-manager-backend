import express, { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { authenticateUser, AuthenticatedRequest } from "../middleware/auth";
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  UpdateTaskStatusRequest,
  GetChildTasksRequest,
  TaskWithChildren,
  AIEnhancementRequest,
  AIEnhancementResponse,
  AIEnhancedTask,
  AISplitTask,
} from "../types";
import { OpenAIService } from "../services/openai-service";
import {
  TaskEnhancementRequestSchema,
  AIEnhancementResponseSchema,
} from "../schemas/ai-enhancement";

const router = express.Router();

// All routes in this file require authentication
router.use(authenticateUser);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for the authenticated user
 * @access  Private
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  console.log("📋 GET /api/tasks called");
  try {
    const authenticatedReq = req as any;
    const { with_children, limit } = req.query;

    const limitNumber = limit ? parseInt(limit as string) : 200;

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", authenticatedReq.user.id)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limitNumber);

    console.log("Tasks:", tasks);
    console.log("Error:", error);

    res.json({ tasks });
  } catch (error) {
    console.error("Fetch tasks error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch tasks",
    });
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get a specific task by ID
 * @access  Private
 */
router.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const authenticatedReq = req as any;

      const { data: task, error } = await supabase!
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("user_id", authenticatedReq.user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          res.status(404).json({
            error: "Not Found",
            message: "Task not found",
          });
          return;
        }
        res.status(400).json({
          error: "Database Error",
          message: error.message,
        });
        return;
      }

      res.json({ task });
    } catch (error) {
      console.error("Fetch task error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch task",
      });
    }
  }
);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post(
  "/",
  async (
    req: Request<{}, {}, CreateTaskRequest>,
    res: Response
  ): Promise<void> => {
    console.log("📋 POST /api/tasks called");
    console.log("   Body:", req.body);

    try {
      const {
        title,
        description,
        status = "not_started",
        priority = "medium",
        due_date,
        estimated_hours,
        tags,
        parent_task_id,
      } = req.body;
      const authenticatedReq = req as AuthenticatedRequest;

      console.log("   User ID:", authenticatedReq.user.id);
      console.log("   User object:", authenticatedReq.user);

      if (!title) {
        res.status(400).json({
          error: "Bad Request",
          message: "Title is required",
        });
        return;
      }

      // Validate status value
      const validStatuses = [
        "not_started",
        "planning",
        "in_progress",
        "review",
        "testing",
        "completed",
        "on_hold",
        "cancelled",
        "deferred",
        "blocked",
      ];
      if (status && !validStatuses.includes(status)) {
        res.status(400).json({
          error: "Bad Request",
          message: `Invalid status. Must be one of: ${validStatuses.join(
            ", "
          )}`,
        });
        return;
      }

      // Validate priority value
      const validPriorities = ["low", "medium", "high"];
      if (priority && !validPriorities.includes(priority)) {
        res.status(400).json({
          error: "Bad Request",
          message: `Invalid priority. Must be one of: ${validPriorities.join(
            ", "
          )}`,
        });
        return;
      }

      const insertData = {
        title,
        description,
        status,
        priority,
        due_date,
        estimated_hours,
        tags,
        parent_task_id,
        user_id: authenticatedReq.user.id,
      };

      console.log("   Insert data:", insertData);

      const { data: task, error } = await supabase!
        .from("tasks")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Database insert error:", error);
        console.error("Attempted insert data:", {
          title,
          description,
          status,
          priority,
          due_date,
          estimated_hours,
          tags,
          parent_task_id,
          user_id: authenticatedReq.user.id,
        });
        res.status(400).json({
          error: "Database Error",
          message: error.message,
        });
        return;
      }

      res.status(201).json({
        message: "Task created successfully",
        task,
      });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to create task",
      });
    }
  }
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 * @access  Private
 */
router.put(
  "/:id",
  async (
    req: Request<{ id: string }, {}, UpdateTaskRequest>,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        status,
        priority,
        due_date,
        estimated_hours,
        tags,
        parent_task_id,
      } = req.body;
      const authenticatedReq = req as any;

      // First check if the task exists and belongs to the user
      const { data: existingTask, error: fetchError } = await supabase!
        .from("tasks")
        .select("id")
        .eq("id", id)
        .eq("user_id", authenticatedReq.user.id)
        .single();

      if (fetchError || !existingTask) {
        res.status(404).json({
          error: "Not Found",
          message: "Task not found",
        });
        return;
      }

      const { data: task, error } = await supabase!
        .from("tasks")
        .update({
          title,
          description,
          status,
          priority,
          due_date,
          estimated_hours,
          tags,
          parent_task_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", authenticatedReq.user.id)
        .select()
        .single();

      if (error) {
        res.status(400).json({
          error: "Database Error",
          message: error.message,
        });
        return;
      }

      res.json({
        message: "Task updated successfully",
        task,
      });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update task",
      });
    }
  }
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const authenticatedReq = req as any;

      // First check if the task exists and belongs to the user
      const { data: existingTask, error: fetchError } = await supabase!
        .from("tasks")
        .select("id")
        .eq("id", id)
        .eq("user_id", authenticatedReq.user.id)
        .single();

      if (fetchError || !existingTask) {
        res.status(404).json({
          error: "Not Found",
          message: "Task not found",
        });
        return;
      }

      const { error } = await supabase!
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("user_id", authenticatedReq.user.id);

      if (error) {
        res.status(400).json({
          error: "Database Error",
          message: error.message,
        });
        return;
      }

      res.json({
        message: "Task deleted successfully",
      });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to delete task",
      });
    }
  }
);

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update task status
 * @access  Private
 */
router.patch(
  "/:id/status",
  async (
    req: Request<{ id: string }, {}, UpdateTaskStatusRequest>,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const authenticatedReq = req as any;

      if (!status) {
        res.status(400).json({
          error: "Bad Request",
          message: "Status is required",
        });
        return;
      }

      const validStatuses = [
        "not_started",
        "planning",
        "in_progress",
        "review",
        "testing",
        "completed",
        "on_hold",
        "cancelled",
        "deferred",
        "blocked",
      ];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: "Bad Request",
          message: "Invalid status value",
        });
        return;
      }

      const { data: task, error } = await supabase!
        .from("tasks")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", authenticatedReq.user.id)
        .select()
        .single();

      if (error) {
        res.status(400).json({
          error: "Database Error",
          message: error.message,
        });
        return;
      }

      res.json({
        message: "Task status updated successfully",
        task,
      });
    } catch (error) {
      console.error("Update task status error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update task status",
      });
    }
  }
);

/**
 * @route   GET /api/tasks/:id/children
 * @desc    Get all child tasks for a specific parent task
 * @access  Private
 */
router.get(
  "/:id/children",
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    console.log("📋 GET /api/tasks/:id/children called");
    try {
      const { id } = req.params;
      const authenticatedReq = req as any;

      const { data: children, error } = await supabase!
        .from("tasks")
        .select("*")
        .eq("parent_task_id", id)
        .eq("user_id", authenticatedReq.user.id)
        .order("created_at", { ascending: true });

      if (error) {
        res.status(400).json({
          error: "Database Error",
          message: error.message,
        });
        return;
      }

      res.json({
        children: children || [],
        parent_task_id: id,
      });
    } catch (error) {
      console.error("Fetch child tasks error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch child tasks",
      });
    }
  }
);

/**
 * @route   GET /api/tasks/:id/with-children
 * @desc    Get a task with all its child tasks
 * @access  Private
 */
router.get(
  "/:id/with-children",
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    console.log("📋 GET /api/tasks/:id/with-children called");
    try {
      const { id } = req.params;
      const authenticatedReq = req as any;

      // Get the parent task
      const { data: parentTask, error: parentError } = await supabase!
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("user_id", authenticatedReq.user.id)
        .single();

      if (parentError) {
        if (parentError.code === "PGRST116") {
          res.status(404).json({
            error: "Not Found",
            message: "Parent task not found",
          });
          return;
        }
        res.status(400).json({
          error: "Database Error",
          message: parentError.message,
        });
        return;
      }

      // Get child tasks
      const { data: children, error: childrenError } = await supabase!
        .from("tasks")
        .select("*")
        .eq("parent_task_id", id)
        .eq("user_id", authenticatedReq.user.id)
        .order("created_at", { ascending: true });

      if (childrenError) {
        res.status(400).json({
          error: "Database Error",
          message: childrenError.message,
        });
        return;
      }

      const taskWithChildren: TaskWithChildren = {
        ...parentTask,
        children: children || [],
        child_count: (children || []).length,
      };

      res.json({
        task: taskWithChildren,
      });
    } catch (error) {
      console.error("Fetch task with children error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch task with children",
      });
    }
  }
);

/**
 * @route   POST /api/tasks/:id/enhance-ai
 * @desc    Enhance task with AI - either enhance content or split into subtasks
 * @access  Private
 */
router.post(
  "/:id/enhance-ai",
  async (
    req: Request<{ id: string }, {}, AIEnhancementRequest>,
    res: Response
  ): Promise<void> => {
    console.log("🤖 POST /api/tasks/:id/enhance-ai called");
    console.log("   Body:", req.body);

    try {
      const { id } = req.params;
      const { enhancement_type } = req.body;
      const authenticatedReq = req as any;

      // Validate request body with Zod
      const validationResult = TaskEnhancementRequestSchema.safeParse({
        enhancement_type,
        task_id: id,
      });

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: "Bad Request",
          message: `Validation failed: ${validationResult.error.errors
            .map((e) => e.message)
            .join(", ")}`,
        });
        return;
      }

      // Get the original task
      const { data: originalTask, error: taskError } = await supabase!
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("user_id", authenticatedReq.user.id)
        .single();

      if (taskError) {
        res.status(404).json({
          success: false,
          error: "Not Found",
          message: "Task not found",
        });
        return;
      }

      // Initialize OpenAI service
      const openaiService = new OpenAIService();

      // Set up timeout for AI processing
      const aiTimeout = setTimeout(() => {
        // Update task status to indicate timeout
        supabase!
          .from("tasks")
          .update({
            ai_enhancement_status: "enhancement_failed",
            ai_enhancement_notes: "AI enhancement timed out after 60 seconds",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", authenticatedReq.user.id);
      }, 60000); // 60 second timeout

      if (enhancement_type === "enhance") {
        try {
          // Enhance the task title and description using OpenAI
          const openaiRequest = {
            task_title: originalTask.title,
            task_description: originalTask.description,
            enhancement_type: "enhance" as const,
          };

          const enhancedTask = await openaiService.enhanceTask(openaiRequest);

          // Clear timeout since we got a response
          clearTimeout(aiTimeout);

          // Update the task in the database
          const { data: updatedTask, error: updateError } = await supabase!
            .from("tasks")
            .update({
              title: enhancedTask.enhanced_title,
              description:
                enhancedTask.enhanced_description || originalTask.description,
              ai_enhanced_title: enhancedTask.enhanced_title,
              ai_enhanced_description: enhancedTask.enhanced_description,
              ai_enhancement_notes: enhancedTask.enhancement_notes,
              ai_enhancement_status: "enhanced",
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("user_id", authenticatedReq.user.id)
            .select()
            .single();

          if (updateError) {
            res.status(500).json({
              success: false,
              error: "Database Error",
              message: "Failed to update enhanced task",
            });
            return;
          }

          const response: AIEnhancementResponse = {
            success: true,
            message: "Task enhanced successfully with AI",
            data: {
              id: updatedTask.id,
              title: updatedTask.title,
              description: updatedTask.description,
              enhanced_title: enhancedTask.enhanced_title,
              enhanced_description: enhancedTask.enhanced_description,
              ai_enhancement_notes: enhancedTask.enhancement_notes,
            },
          };

          res.json(response);
        } catch (error) {
          clearTimeout(aiTimeout);
          throw error;
        }
      } else if (enhancement_type === "split") {
        try {
          // Split the task into subtasks using OpenAI
          const openaiRequest = {
            task_title: originalTask.title,
            task_description: originalTask.description,
            enhancement_type: "split" as const,
          };

          const splitResult = await openaiService.splitTask(openaiRequest);

          // Clear timeout since we got a response
          clearTimeout(aiTimeout);

          // Create the subtasks in the database
          const createdSubtasks = [];
          for (const subtask of splitResult.subtasks) {
            const { data: newSubtask, error: createError } = await supabase!
              .from("tasks")
              .insert({
                title: subtask.title,
                description: subtask.description,
                status: "not_started",
                priority: subtask.priority,
                tags: subtask.tags || [],
                user_id: authenticatedReq.user.id,
                parent_task_id: id,
              })
              .select()
              .single();

            if (createError) {
              console.error("Failed to create subtask:", createError);
              continue;
            }

            createdSubtasks.push(newSubtask);
          }

          // Update the parent task status to indicate it's been split
          await supabase!
            .from("tasks")
            .update({
              status: "in_progress",
              ai_enhancement_status: "enhanced",
              ai_enhancement_notes: `Task split into ${createdSubtasks.length} subtasks using AI`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("user_id", authenticatedReq.user.id);

          const response: AIEnhancementResponse = {
            success: true,
            message: `Task split into ${createdSubtasks.length} subtasks`,
            data: {
              parent_task_id: id,
              subtasks: createdSubtasks.map((task) => ({
                title: task.title,
                description: task.description,
                estimated_effort: "AI estimated",
                priority: task.priority,
                tags: task.tags,
              })),
              split_reasoning: splitResult.split_reasoning,
            },
          };

          res.json(response);
        } catch (error) {
          clearTimeout(aiTimeout);
          throw error;
        }
      }
    } catch (error) {
      console.error("AI enhancement error:", error);
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: `Failed to enhance task with AI: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  }
);

/**
 * @route   GET /api/tasks/:id/enhance-ai/status
 * @desc    Get real-time AI enhancement status using Server-Sent Events
 * @access  Private
 */
router.get(
  "/:id/enhance-ai/status",
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    console.log("📡 GET /api/tasks/:id/enhance-ai/status called (SSE)");

    try {
      const { id } = req.params;
      const authenticatedReq = req as any;

      // Set SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      // Send initial connection message
      res.write(
        `event: connected\ndata: {"status": "connected", "task_id": "${id}"}\n\n`
      );

      // Check if task exists and user has access
      const { data: task, error: taskError } = await supabase!
        .from("tasks")
        .select("id, title, ai_enhancement_status")
        .eq("id", id)
        .eq("user_id", authenticatedReq.user.id)
        .single();

      if (taskError) {
        res.write(
          `event: error\ndata: {"status": "error", "message": "Task not found"}\n\n`
        );
        res.end();
        return;
      }

      // Send current status
      res.write(
        `event: status\ndata: {"status": "${
          task.ai_enhancement_status || "not_enhanced"
        }", "progress": 0, "message": "Monitoring enhancement status..."}\n\n`
      );

      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        res.write(
          `event: timeout\ndata: {"status": "timeout", "message": "Connection timed out. Reconnect to continue monitoring."}\n\n`
        );
        res.end();
      }, 120000); // 2 minutes

      // Keep connection alive and monitor for changes
      const interval = setInterval(async () => {
        try {
          const { data: updatedTask, error: updateError } = await supabase!
            .from("tasks")
            .select("ai_enhancement_status, ai_enhancement_notes")
            .eq("id", id)
            .eq("user_id", authenticatedReq.user.id)
            .single();

          if (updateError) {
            res.write(
              `event: error\ndata: {"status": "error", "message": "Failed to fetch task status"}\n\n`
            );
            clearInterval(interval);
            clearTimeout(connectionTimeout);
            res.end();
            return;
          }

          // Send status update
          const status = updatedTask.ai_enhancement_status || "not_enhanced";
          let progress = 0;
          let message = "";

          switch (status) {
            case "not_enhanced":
              progress = 0;
              message = "Ready for enhancement";
              break;
            case "enhanced":
              progress = 100;
              message = "Enhancement completed successfully";
              break;
            case "enhancement_failed":
              progress = 0;
              message = "Enhancement failed";
              break;
            default:
              progress = 50;
              message = "Enhancement in progress...";
          }

          res.write(
            `event: status\ndata: {"status": "${status}", "progress": ${progress}, "message": "${message}"}\n\n`
          );

          // If enhancement is complete or failed, close connection
          if (status === "enhanced" || status === "enhancement_failed") {
            clearInterval(interval);
            clearTimeout(connectionTimeout);

            if (status === "enhanced") {
              res.write(
                `event: complete\ndata: {"status": "completed", "message": "AI enhancement completed successfully"}\n\n`
              );
            } else {
              res.write(
                `event: error\ndata: {"status": "error", "message": "AI enhancement failed"}\n\n`
              );
            }

            res.end();
          }
        } catch (error) {
          console.error("SSE status check error:", error);
          res.write(
            `event: error\ndata: {"status": "error", "message": "Status check failed"}\n\n`
          );
          clearInterval(interval);
          clearTimeout(connectionTimeout);
          res.end();
        }
      }, 2000); // Check every 2 seconds

      // Handle client disconnect
      req.on("close", () => {
        console.log("Client disconnected from SSE stream");
        clearInterval(interval);
        clearTimeout(connectionTimeout);
        res.end();
      });
    } catch (error) {
      console.error("SSE endpoint error:", error);
      res.write(
        `event: error\ndata: {"status": "error", "message": "Internal server error"}\n\n`
      );
      res.end();
    }
  }
);

export default router;
