import { Router } from "express";
import type { Request, Response } from "express";
import { runFastApiChat } from "./FastApiService.ts";
import { ChatMessage } from "./ChatModel.ts";

const router = Router();

// POST /api/chat — Proxy to FastAPI Agent
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      res.status(400).json({ error: "userId and message are required" });
      return;
    }

    const reply = await runFastApiChat(userId, message);
    res.status(200).json({ reply });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "AI agent error",
      message: error.message,
    });
  }
});

// GET /api/chat/history/:userId — Fetch recent chat history
router.get(
  "/history/:userId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId as string;
      const messages = await ChatMessage.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50);
      res.status(200).json(messages.reverse());
    } catch (error: any) {
      console.error("Chat history error:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  }
);

// DELETE /api/chat/history/:userId — Clear all chat history
router.delete(
  "/history/:userId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId as string;
      await ChatMessage.deleteMany({ userId });
      res.status(200).json({ message: "Chat history cleared" });
    } catch (error: any) {
      console.error("Clear history error:", error);
      res.status(500).json({ error: "Failed to clear history" });
    }
  }
);

// GET /api/chat/report/:userId — AI-generated report from chat history
router.get(
  "/report/:userId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId as string;

      // Fetch chat history from DB
      const messages = await ChatMessage.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50);
      const history = messages.reverse().map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`http://localhost:8000/api/report?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      });
      const data = await response.json();
      res.status(200).json({
        report: data.report,
        moodScore: data.moodScore
      });
    } catch (error: any) {
      console.error("Report error:", error);
      res.status(500).json({ error: "Report generation failed" });
    }
  }
);

export default router;
