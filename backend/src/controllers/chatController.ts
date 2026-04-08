import { Request, Response } from "express";
import prisma from "../config/db";

export const getGlobalMessages = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. Pehle "Global Chat" Room dhoondo
    const globalConversation = await prisma.conversation.findFirst({
      where: { name: "Global Chat" },
    });

    // Agar room hi nahi bana (kisi ne message nahi kiya ab tak), toh khali array bhej do
    if (!globalConversation) {
      res.status(200).json([]);
      return;
    }

    // 2. Us room ke saare messages uthao, purane se naye ki tarteeb (ascending) mein
    const messages = await prisma.message.findMany({
      where: { conversationId: globalConversation.id },
      orderBy: { createdAt: "asc" },
      // Message ke sath bhejne wale ka naam bhi le aao taake UI mein dikha sakein
      include: {
        sender: {
          select: { name: true, email: true },
        },
      },
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};
