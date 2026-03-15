import type { Request, Response } from "express";
import { Medicine } from "./medicineModel.ts";

export const addMedicine = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, name, dosage, schedule, notes } = req.body;

    // In a real app we'd get userId from auth middleware
    if (!userId || !name || !dosage || !schedule) {
      res
        .status(400)
        .json({ error: "userId, name, dosage, and schedule are required" });
      return;
    }

    const newMedicine = new Medicine({
      userId,
      name,
      dosage,
      schedule,
      notes,
    });

    await newMedicine.save();
    res.status(201).json(newMedicine);
  } catch (error) {
    console.error("Error adding medicine:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getMedicines = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const medicines = await Medicine.find({ userId });
    res.status(200).json(medicines);
  } catch (error) {
    console.error("Error getting medicines:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateMedicineStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { scheduleIndex, status } = req.body;

    if (scheduleIndex === undefined || !status) {
      res.status(400).json({ error: "scheduleIndex and status are required" });
      return;
    }

    const medicine = await Medicine.findById(id);
    if (!medicine) {
      res.status(404).json({ error: "Medicine not found" });
      return;
    }

    if (!medicine || !medicine.schedule || !medicine.schedule[scheduleIndex]) {
      res.status(400).json({ error: "Invalid schedule index" });
      return;
    }

    medicine.schedule[scheduleIndex].status = status;
    await medicine.save();

    res.status(200).json(medicine);
  } catch (error) {
    console.error("Error updating medicine status:", error);
    res.status(500).json({ error: "Server error" });
  }
};
