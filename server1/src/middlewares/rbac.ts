import type { Request, Response, NextFunction } from "express";
import { User } from "../user/userModel";

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const doctorOnly = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user.id;

  const userDetails = await User.findById(userId);

  if (userDetails?.role !== "doctor") {
    return res
      .status(403)
      .json({ message: "Access denied. Only doctors are allowed." });
  }
  next();
};

export const patientOnly = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user.id;

  const userDetails = await User.findById(userId);

  if (userDetails?.role !== "patient") {
    return res
      .status(403)
      .json({ message: "Access denied. Only patients are allowed." });
  }
  next();
};
