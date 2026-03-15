import express from "express";
import cors from "cors";
import { connectDB } from "./src/database/mongo-db.ts";
import userRouter from "./src/user/userRoutes.ts";
import medicineRouter from "./src/medicine/medicineRoutes.ts";
import moodRouter from "./src/mood/moodRoutes.ts";
import reportRouter from "./src/report/reportRoutes.ts";
import chatRouter from "./src/llm/chatRoutes.ts";
import objectRouter from "./src/llm/objectRoutes.ts";
import { startMedicineCron } from "./src/cron/medicineCron.ts";

const app = express();

app.use(cors());
app.use(express.json());
// app.use(generalLimiter);

connectDB("mongodb://localhost:27017/embark");
startMedicineCron();

app.use("/api/users", userRouter);
app.use("/api/medicines", medicineRouter);
app.use("/api/moods", moodRouter);
app.use("/api/reports", reportRouter);
app.use("/api/chat", chatRouter);
app.use("/api/objects", objectRouter);
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server started on port 3000");
});
