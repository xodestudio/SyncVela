import { Request, Response } from "express";
import prisma from "../config/db";

export const getPrivateMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      res.status(400).json({ error: "Room ID is required" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: String(roomId) },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("❌ Error fetching private messages:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};

export const getUnreadCounts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "Valid User ID is strictly required" });
      return;
    }

    // 1. User ki saari conversations aur unka lastReadAt nikal lo
    const userParticipants = await prisma.participant.findMany({
      where: { userId: userId },
      select: { conversationId: true, lastReadAt: true },
    });

    const counts: Record<string, number> = {};

    // 2. Har conversation ke liye unread messages count karo
    for (const p of userParticipants) {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId }, // Apne bheje hue messages count nahi karne
          // Agar lastReadAt null hai (kabhi open nahi ki chat), ya message baad mein aya hai
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });

      if (unreadCount > 0) {
        // Samne wale user ki ID nikalne ke liye us conversation ka doosra participant dhoondo
        const otherParticipant = await prisma.participant.findFirst({
          where: { conversationId: p.conversationId, userId: { not: userId } },
          select: { userId: true },
        });

        if (otherParticipant) {
          counts[otherParticipant.userId] = unreadCount;
        }
      }
    }

    res.status(200).json(counts);
  } catch (error) {
    console.error("❌ Error fetching unread counts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
