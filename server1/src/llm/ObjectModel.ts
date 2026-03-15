import mongoose from "mongoose";

const objectSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        objectName: { type: String, required: true },
        location: { type: String, required: true },
    },
    { timestamps: true },
);

export const ObjectRecord = mongoose.model("ObjectRecord", objectSchema);
