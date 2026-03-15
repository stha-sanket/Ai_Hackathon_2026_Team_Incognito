import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    dosage: {
      type: String,
      required: true,
    },
    schedule: [
      {
        time: String, // e.g. "08:00 AM"
        status: {
          type: String,
          enum: ["pending", "taken", "skipped"],
          default: "pending",
        },
      },
    ],
    notes: {
      type: String,
    },
  },
  { timestamps: true },
);

export const Medicine = mongoose.model("Medicine", medicineSchema);
