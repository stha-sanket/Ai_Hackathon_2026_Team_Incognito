import { Router } from "express";
import {
  addMedicine,
  getMedicines,
  updateMedicineStatus,
  deleteMedicine,
  editMedicine,
} from "./medicineController.ts";

const router = Router();

router.post("/", addMedicine);
router.get("/user/:userId", getMedicines);
router.put("/:id/status", updateMedicineStatus);
router.put("/:id", editMedicine);
router.delete("/:id", deleteMedicine);

export default router;
