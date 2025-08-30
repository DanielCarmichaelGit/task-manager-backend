import { z } from "zod";

// Zod schema for task enhancement request
export const TaskEnhancementRequestSchema = z.object({
  enhancement_type: z.enum(["enhance", "split"]),
  task_id: z.string().uuid(),
});

// Zod schema for enhanced task response
export const EnhancedTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  enhanced_title: z.string(),
  enhanced_description: z.string().optional(),
  ai_enhancement_notes: z.string(),
});

// Zod schema for task splitting response
export const SplitTaskSchema = z.object({
  parent_task_id: z.string().uuid(),
  subtasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      estimated_effort: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      tags: z.array(z.string()).optional(),
    })
  ),
  split_reasoning: z.string(),
});

// Zod schema for AI enhancement response
export const AIEnhancementResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.union([EnhancedTaskSchema, SplitTaskSchema]).optional(),
  error: z.string().optional(),
});

// Zod schema for OpenAI API request
export const OpenAIEnhancementRequestSchema = z.object({
  task_title: z.string(),
  task_description: z.string().optional(),
  enhancement_type: z.enum(["enhance", "split"]),
});

// Zod schema for OpenAI enhancement response
export const OpenAIEnhancementResponseSchema = z.object({
  enhanced_title: z.string(),
  enhanced_description: z.string().optional(),
  enhancement_notes: z.string(),
});

// Zod schema for OpenAI split response
export const OpenAISplitResponseSchema = z.object({
  subtasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      estimated_effort: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      tags: z.array(z.string()).optional(),
    })
  ),
  split_reasoning: z.string(),
});

// Type exports
export type TaskEnhancementRequest = z.infer<
  typeof TaskEnhancementRequestSchema
>;
export type EnhancedTask = z.infer<typeof EnhancedTaskSchema>;
export type SplitTask = z.infer<typeof SplitTaskSchema>;
export type AIEnhancementResponse = z.infer<typeof AIEnhancementResponseSchema>;
export type OpenAIEnhancementRequest = z.infer<
  typeof OpenAIEnhancementRequestSchema
>;
export type OpenAIEnhancementResponse = z.infer<
  typeof OpenAIEnhancementResponseSchema
>;
export type OpenAISplitResponse = z.infer<typeof OpenAISplitResponseSchema>;
