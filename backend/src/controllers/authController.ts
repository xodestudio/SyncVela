import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db";

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, name, password } = req.body;

    // 1. Validation: Koi field khali toh nahi?
    if (!email || !name || !password) {
      res.status(400).json({ error: "All fields are required." });
      return;
    }

    // 2. Check: Kya user pehle se database mein hai?
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: "User with this email already exists." });
      return;
    }

    // 3. Security: Password hash karna
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Database Insert
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    // 5. JWT Generation (Authentication Token)
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }, // Token 7 din baad expire hoga
    );

    // 6. Response bhejna (Password kabhi wapis response mein nahi bhejte)
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
