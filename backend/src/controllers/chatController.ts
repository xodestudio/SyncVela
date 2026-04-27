import { Request, Response } from "express";
import prisma from "../config/db";

export const getPrivateMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { roomId } = req.params;
    // NAYA: Frontend batayega ke uske paas sab se purana message konsa hai (cursor)
    const { cursor } = req.query;
    const limit = 30; // Ek waqt mein sirf 30 messages

    if (!roomId) {
      res.status(400).json({ error: "Room ID is required" });
      return;
    }

    // 1. Messages nikal lo (Cursor logic ke sath)
    const messages = await prisma.message.findMany({
      where: { conversationId: String(roomId) },
      take: limit, // Sirf 30 uthao
      ...(cursor
        ? {
            skip: 1, // Cursor wale message ko dobara mat uthao
            cursor: { id: String(cursor) },
          }
        : {}),
      orderBy: { createdAt: "desc" }, // Sab se naye messages pehle lao taake aakhri 30 milen
    });

    // Frontend ko seedha dikhane ke liye unhe wapis Ascending order mein kar do
    const sortedMessages = messages.reverse();

    // 2. Us room ke participants ka read time nikal lo (Blue Ticks ke liye)
    const participants = await prisma.participant.findMany({
      where: { conversationId: String(roomId) },
      select: { userId: true, lastReadAt: true },
    });

    // Batao ke kya aur purane messages baqi hain database mein?
    const hasMore = messages.length === limit;

    res.status(200).json({
      messages: sortedMessages,
      participants,
      hasMore, // Frontend ko pata ho ke aur scroll karne par api hit karni hai ya nahi
      nextCursor: sortedMessages.length > 0 ? sortedMessages[0].id : null,
    });
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
