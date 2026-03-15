import mongoose from "mongoose";

const moodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: {
      type: Number, // e.g. 1 to 10
      required: true,
    },
    sentiment: {
      type: String, // e.g. "positive", "neutral", "negative"
      required: true,
    },
    notes: {
      type: String, // Context from the conversation
    },
  },
  { timestamps: true },
);

export const Mood = mongoose.model("Mood", moodSchema);
