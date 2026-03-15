import { Router } from "express";
import { logMood, getMoodHistory } from "./moodController.ts";

const router = Router();

router.post("/", logMood);
router.get("/user/:userId", getMoodHistory);

export default router;
