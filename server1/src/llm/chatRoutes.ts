import { Router } from "express";
import type { Request, Response } from "express";
import { runAgentChat, generateUserReport } from "./GeminiService.ts";

const router = Router();

// POST /api/chat — Main agentic conversation endpoint
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      res.status(400).json({ error: "userId and message are required" });
      return;
    }

    const reply = await runAgentChat(userId, message);
    res.status(200).json({ reply });
  } catch (error: any) {
    console.error("Chat error:", error);
    res
      .status(500)
      .json({
        error: "AI agent error",
        message: error.message,
        details: error.message,
      });
  }
});

// GET /api/chat/report/:userId — Gemini-generated health report
router.get(
  "/report/:userId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId as string;
      const report = await generateUserReport(userId);
      res.status(200).json({ report });
    } catch (error: any) {
      console.error("Report error:", error);
      res.status(500).json({ error: "Report generation failed" });
    }
  },
);

export default router;
