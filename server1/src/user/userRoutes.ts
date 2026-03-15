import { Router } from "express";
import { registerUser, loginUser } from "./userController";
import { strictLimiter } from "../middlewares/rate-limiter";

const userRouter = Router();

userRouter.post("/register", strictLimiter, registerUser);
userRouter.post("/login", strictLimiter, loginUser);

export default userRouter;
