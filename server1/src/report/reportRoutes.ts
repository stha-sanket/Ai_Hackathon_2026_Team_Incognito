import { Router } from "express";
import { getDailyReport } from "./reportController.ts";

const router = Router();

router.get("/daily/:userId", getDailyReport);

export default router;
