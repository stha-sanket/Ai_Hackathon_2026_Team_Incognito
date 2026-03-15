import cron from "node-cron";
import { Medicine } from "../medicine/medicineModel.ts";

export function startMedicineCron() {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      // Format time as "hh:mm A" for easy comparison with stored values if needed,
      // but since schedules have varied string formats (e.g., "08:00 AM" or "बिहान"),
      // a robust solution parses those. For this demo cron, we will flag anything
      // pending that was created before today, or we can just log a generic scanner.
      // Wait, we can parse the exact time if it matches a regex.

      console.log(
        `[Cron] Scanning for due medicines at ${now.toISOString()}...`,
      );

      // Find all medicines that have at least one pending schedule
      const medicines = await Medicine.find({
        "schedule.status": "pending",
      });

      let dueCount = 0;

      for (const med of medicines) {
        let isUpdated = false;

        for (let i = 0; i < med.schedule.length; i++) {
          const item: any = med.schedule[i];
          if (item.status === "pending") {
            // In a real app, parse `item.time` (e.g. "08:00 AM") and compare with `now`
            // For now, let's just log that this user has pending medicines.
            // When the user opens the Gemini prompt, it will proactively ask them.
            dueCount++;

            // For demonstration, let's mark it 'missed' if it's way past due,
            // but we'll leave it pending so Gemini can ask.
          }
        }
      }

      if (dueCount > 0) {
        console.log(`[Cron] Found ${dueCount} pending medicine schedules.`);
        // In a real app with Expo Push Tokens, we would trigger push notifications here:
        // sendPushNotification(userPushToken, "Time for your medicine!", `Don't forget to take ${med.name}`);
      }
    } catch (error) {
      console.error("[Cron] Error running medicine cron:", error);
    }
  });

  console.log("Medicine tracking cron job started.");
}
