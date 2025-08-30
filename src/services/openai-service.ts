import OpenAI from "openai";
import {
  OpenAIEnhancementRequest,
  OpenAIEnhancementResponse,
  OpenAISplitResponse,
  OpenAIEnhancementRequestSchema,
  OpenAIEnhancementResponseSchema,
  OpenAISplitResponseSchema,
} from "../schemas/ai-enhancement";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  /**
   * Enhance a task title and description using OpenAI
   */
  async enhanceTask(
    request: OpenAIEnhancementRequest
  ): Promise<OpenAIEnhancementResponse> {
    try {
      // Validate input
      const validatedRequest = OpenAIEnhancementRequestSchema.parse(request);

      const prompt = this.buildEnhancementPrompt(validatedRequest);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a task management expert. Your job is to enhance task titles and descriptions to make them more specific, actionable, and clear. 
            
            Guidelines:
            - Make titles more specific and actionable
            - Add context and success criteria to descriptions
            - Use clear, professional language
            - Keep enhancements concise but informative
            - Focus on clarity and actionability`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      // Parse and validate the response
      const parsedResponse = this.parseEnhancementResponse(content);
      return OpenAIEnhancementResponseSchema.parse(parsedResponse);
    } catch (error) {
      console.error("OpenAI enhancement error:", error);
      throw new Error(
        `Failed to enhance task: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Split a task into subtasks using OpenAI
   */
  async splitTask(
    request: OpenAIEnhancementRequest
  ): Promise<OpenAISplitResponse> {
    try {
      // Validate input
      const validatedRequest = OpenAIEnhancementRequestSchema.parse(request);

      const prompt = this.buildSplitPrompt(validatedRequest);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a project management expert. Your job is to break down complex tasks into logical, manageable subtasks.
            
            Guidelines:
            - Break tasks into 3-6 logical subtasks
            - Each subtask should be specific and actionable
            - Consider natural workflow progression (research → plan → execute → review)
            - Provide realistic effort estimates
            - Assign appropriate priority levels
            - Use clear, descriptive titles
            - Include relevant tags when appropriate`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content from OpenAI");
      }

      // Parse and validate the response
      const parsedResponse = this.parseSplitResponse(content);
      return OpenAISplitResponseSchema.parse(parsedResponse);
    } catch (error) {
      console.error("OpenAI split error:", error);
      throw new Error(
        `Failed to split task: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private buildEnhancementPrompt(request: OpenAIEnhancementRequest): string {
    const { task_title, task_description, enhancement_type } = request;

    return `Please enhance the following task:

Task Title: "${task_title}"
${
  task_description
    ? `Task Description: "${task_description}"`
    : "No description provided"
}

Enhancement Type: ${enhancement_type}

Please provide your response in the following JSON format:
{
  "enhanced_title": "Enhanced, more specific title",
  "enhanced_description": "Enhanced description with more context and clarity",
  "enhancement_notes": "Brief explanation of what was improved"
}

Focus on making the task more specific, actionable, and clear.`;
  }

  private buildSplitPrompt(request: OpenAIEnhancementRequest): string {
    const { task_title, task_description, enhancement_type } = request;

    return `Please break down the following complex task into logical subtasks:

Task Title: "${task_title}"
${
  task_description
    ? `Task Description: "${task_description}"`
    : "No description provided"
}

Please provide your response in the following JSON format:
{
  "subtasks": [
    {
      "title": "Subtask title",
      "description": "Clear description of what needs to be done",
      "estimated_effort": "Realistic time estimate (e.g., '2-3 hours', '1 day')",
      "priority": "low|medium|high",
      "tags": ["tag1", "tag2"]
    }
  ],
  "split_reasoning": "Brief explanation of why this breakdown makes sense"
}

Break this into 3-6 logical subtasks that follow a natural workflow progression.`;
  }

  private parseEnhancementResponse(content: string): OpenAIEnhancementResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        enhanced_title: parsed.enhanced_title || "",
        enhanced_description: parsed.enhanced_description || "",
        enhancement_notes:
          parsed.enhancement_notes ||
          "Task enhanced for clarity and actionability",
      };
    } catch (error) {
      console.error("Failed to parse enhancement response:", error);
      // Fallback to basic enhancement
      return {
        enhanced_title: `[Enhanced] ${content.split("\n")[0] || "Task"}`,
        enhanced_description: content,
        enhancement_notes:
          "Task enhanced using AI (parsing failed, using raw response)",
      };
    }
  }

  private parseSplitResponse(content: string): OpenAISplitResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        subtasks: parsed.subtasks || [],
        split_reasoning:
          parsed.split_reasoning || "Task broken down into logical subtasks",
      };
    } catch (error) {
      console.error("Failed to parse split response:", error);
      // Fallback to basic split
      return {
        subtasks: [
          {
            title: "Research and Planning",
            description: "Initial research and planning phase",
            estimated_effort: "2-3 hours",
            priority: "medium" as const,
            tags: ["planning"],
          },
          {
            title: "Implementation",
            description: "Main implementation work",
            estimated_effort: "4-8 hours",
            priority: "high" as const,
            tags: ["execution"],
          },
          {
            title: "Review and Testing",
            description: "Final review and testing",
            estimated_effort: "1-2 hours",
            priority: "medium" as const,
            tags: ["review"],
          },
        ],
        split_reasoning: "Task split into basic phases due to parsing error",
      };
    }
  }
}
