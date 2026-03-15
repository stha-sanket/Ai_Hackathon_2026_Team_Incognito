import { User } from "./userModel";
import type { Request, Response } from "express";

interface RegisterRequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface LoginRequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const registerUser = async (
  req: RegisterRequestWithUser,
  res: Response,
) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof role !== "string"
    ) {
      return res.status(400).json({
        message: "INVALID DATA RECEIVED",
      });
    }

    const user = await User.create({ name, email, password, role });
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const loginUser = async (req: LoginRequestWithUser, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "INVALID DATA RECEIVED",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};
