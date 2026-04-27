import { Request, Response } from "express";
import prisma from "../config/db";

export const getUsersForSidebar = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { currentUserId } = req.query;

    if (!currentUserId || typeof currentUserId !== "string") {
      res.status(400).json({ error: "Valid Current User ID is required" });
      return;
    }

    // 1. Active Chats Nikalo: Wo saari 1-on-1 chats nikalo jisme main hun, aur time ke hisab se sort karo
    const activeConversations = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        participants: {
          some: { userId: currentUserId },
        },
      },
      orderBy: {
        lastMessageAt: "desc", // Sab se latest oopar
      },
      include: {
        participants: {
          where: { userId: { not: currentUserId } }, // Samne wale ki detail nikalo
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    // 2. User list extract karo
    const activeUsers = activeConversations
      .filter((c) => c.participants.length > 0)
      .map((c) => c.participants[0].user);

    const activeUserIds = activeUsers.map((u) => u.id);

    // 3. Other Users Nikalo: Wo log jinse maine abhi tak baat nahi ki
    const otherUsers = await prisma.user.findMany({
      where: {
        id: {
          notIn: [currentUserId, ...activeUserIds], // Na main khud hun, na wo log jinse chat ho chuki
        },
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: "asc" }, // Inhe naam ke hisab se sort kardo
    });

    // 4. Combine karo aur bhej do (Active log hamesha top par honge)
    const sortedUsersList = [...activeUsers, ...otherUsers];

    res.status(200).json(sortedUsersList);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
