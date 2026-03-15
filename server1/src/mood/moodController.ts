import type { Request, Response } from "express";
import { Mood } from "./moodModel.ts";

export const logMood = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, score, sentiment, notes } = req.body;

    if (!userId || score === undefined || !sentiment) {
      res
        .status(400)
        .json({ error: "userId, score, and sentiment are required" });
      return;
    }

    const newMood = new Mood({
      userId,
      score,
      sentiment,
      notes,
    });

    await newMood.save();
    res.status(201).json(newMood);
  } catch (error) {
    console.error("Error logging mood:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getMoodHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { days } = req.query; // optional: fetch last N days

    let query: any = { userId };
    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - Number(days));
      query.createdAt = { $gte: date };
    }

    const moods = await Mood.find(query).sort({ createdAt: -1 });
    res.status(200).json(moods);
  } catch (error) {
    console.error("Error getting mood history:", error);
    res.status(500).json({ error: "Server error" });
  }
};
