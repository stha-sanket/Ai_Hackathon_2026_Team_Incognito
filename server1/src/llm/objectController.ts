import type { Request, Response } from "express";
import { ObjectRecord } from "./ObjectModel.ts";

// GET /api/objects/user/:userId — List all objects for a user
export const getAllObjects = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const objects = await ObjectRecord.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(objects);
    } catch (error) {
        console.error("Error getting objects:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// GET /api/objects?userId=...&name=... — Search for a specific object
export const getObjectLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, name } = req.query;
        if (!userId || !name) {
            res.status(400).json({ error: "userId and name are required" });
            return;
        }

        const record = await ObjectRecord.findOne({
            userId,
            objectName: { $regex: new RegExp(`^${name}$`, "i") }
        }).sort({ createdAt: -1 });

        if (!record) {
            res.status(404).json({ error: "Object not found" });
            return;
        }

        res.status(200).json({
            location: record.location,
            time: record.createdAt.toLocaleString()
        });
    } catch (error) {
        console.error("Error getting object location:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// POST /api/objects — Save a new object location
export const saveObjectLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, objectName, location } = req.body;
        if (!userId || !objectName || !location) {
            res.status(400).json({ error: "userId, objectName, and location are required" });
            return;
        }

        const newRecord = new ObjectRecord({ userId, objectName, location });
        await newRecord.save();
        res.status(201).json(newRecord);
    } catch (error) {
        console.error("Error saving object location:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// PUT /api/objects/:id — Edit an object
export const editObject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { objectName, location } = req.body;

        const record = await ObjectRecord.findById(id);
        if (!record) {
            res.status(404).json({ error: "Object not found" });
            return;
        }

        if (objectName) record.objectName = objectName;
        if (location) record.location = location;

        await record.save();
        res.status(200).json(record);
    } catch (error) {
        console.error("Error editing object:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// DELETE /api/objects/:id — Delete an object
export const deleteObject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const record = await ObjectRecord.findByIdAndDelete(id);
        if (!record) {
            res.status(404).json({ error: "Object not found" });
            return;
        }
        res.status(200).json({ message: "Object deleted" });
    } catch (error) {
        console.error("Error deleting object:", error);
        res.status(500).json({ error: "Server error" });
    }
};
