import type { Request, Response } from "express";
import { Medicine } from "../medicine/medicineModel.ts";
import { Mood } from "../mood/moodModel.ts";

export const getDailyReport = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;

    // Calculate start and end of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Get Medicines for today (simplified: get all and count those that have "taken" or "skipped" statuses today)
    const medicines = await Medicine.find({ userId });
    let totalScheduled = 0;
    let takenCount = 0;

    medicines.forEach((med) => {
      med.schedule.forEach((s) => {
        totalScheduled++;
        if (s.status === "taken") takenCount++;
      });
    });

    const adherenceRate =
      totalScheduled > 0 ? (takenCount / totalScheduled) * 100 : 0;

    // 2. Get Mood tracking for today
    const todayMoods = await Mood.find({
      userId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    let averageMoodScore = 0;
    if (todayMoods.length > 0) {
      const sum = todayMoods.reduce((acc, current) => acc + current.score, 0);
      averageMoodScore = sum / todayMoods.length;
    }

    // Determine general trend
    let moodTrend = "Neutral";
    if (averageMoodScore >= 7) moodTrend = "Positive";
    else if (averageMoodScore > 0 && averageMoodScore < 4)
      moodTrend = "Negative";

    // 3. Construct Daily Report
    const report = {
      date: startOfDay.toISOString().split("T")[0],
      patientId: userId,
      medicineAdherence: {
        totalScheduled,
        taken: takenCount,
        ratePercentage: Math.round(adherenceRate),
      },
      moodSummary: {
        readingsCount: todayMoods.length,
        averageScore: averageMoodScore.toFixed(1),
        trend: moodTrend,
      },
      activitySummary: "Voice conversational data would be summarized here.",
      reportedSymptoms: [], // Mock placeholder
    };

    res.status(200).json(report);
  } catch (error) {
    console.error("Error generating daily report:", error);
    res.status(500).json({ error: "Server error" });
  }
};
