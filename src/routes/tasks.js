const express = require("express");
const { supabase } = require("../config/supabase");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// All routes in this file require authentication
router.use(authenticateUser);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for the authenticated user
 * @access  Private
 */
router.get("/", async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({
        error: "Database Error",
        message: error.message,
      });
    }

    res.json({
      tasks: tasks || [],
    });
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
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: task, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Not Found",
          message: "Task not found",
        });
      }
      return res.status(400).json({
        error: "Database Error",
        message: error.message,
      });
    }

    res.json({ task });
  } catch (error) {
    console.error("Fetch task error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch task",
    });
  }
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      status = "pending",
      priority = "medium",
      due_date,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Title is required",
      });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description,
        status,
        priority,
        due_date,
        user_id: req.user.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: "Database Error",
        message: error.message,
      });
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
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 * @access  Private
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, due_date } = req.body;

    // First check if the task exists and belongs to the user
    const { data: existingTask, error: fetchError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();

    if (fetchError || !existingTask) {
      return res.status(404).json({
        error: "Not Found",
        message: "Task not found",
      });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update({
        title,
        description,
        status,
        priority,
        due_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: "Database Error",
        message: error.message,
      });
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
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // First check if the task exists and belongs to the user
    const { data: existingTask, error: fetchError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();

    if (fetchError || !existingTask) {
      return res.status(404).json({
        error: "Not Found",
        message: "Task not found",
      });
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) {
      return res.status(400).json({
        error: "Database Error",
        message: error.message,
      });
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
});

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update task status
 * @access  Private
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Status is required",
      });
    }

    const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid status value",
      });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: "Database Error",
        message: error.message,
      });
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
});

module.exports = router;
