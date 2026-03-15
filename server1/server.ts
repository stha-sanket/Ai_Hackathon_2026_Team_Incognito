import express from "express";
import cors from "cors";
import { connectDB } from "./src/database/mongo-db.ts";
import userRouter from "./src/user/userRoutes.ts";

const app = express();

app.use(cors());
app.use(express.json());
// app.use(generalLimiter);

connectDB("mongodb://localhost:27017/embark");

app.use("/api/users", userRouter);  

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
