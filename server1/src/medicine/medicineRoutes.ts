import { Router } from "express";
import {
  addMedicine,
  getMedicines,
  updateMedicineStatus,
} from "./medicineController.ts";

const router = Router();

router.post("/", addMedicine);
router.get("/user/:userId", getMedicines);
router.put("/:id/status", updateMedicineStatus);

export default router;
