import { Request, Response } from "express";
import prisma from "../config/db";

export const getUsersForSidebar = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Frontend se logged-in user ki ID query parameter mein aayegi
    const currentUserId = req.query.currentUserId as string;

    if (!currentUserId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    // Database se saare users lao, lekin current user ko nikal do
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
      },
      select: {
        id: true,
        name: true,
        email: true,
        // Avatar waghera ho toh yahan add kar lena baad mein
      },
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
