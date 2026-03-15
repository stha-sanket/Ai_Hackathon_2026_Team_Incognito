import mongoose from "mongoose";

export const connectDB = async (mongo_url: string) => {
  try {
    await mongoose.connect(mongo_url);
    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }
};
