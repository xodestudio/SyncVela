import { Server } from "socket.io";
import { AuthenticatedSocket } from "../middlewares/authMiddleware";
import prisma from "../config/db";

interface MarkReadPayload {
  roomId: string;
  targetUserId: string; // Jis bande ke messages maine parh liye
}

export const handleChatEvents = (io: Server, socket: AuthenticatedSocket) => {
  const userId = socket.user?.userId;

  // 1. Room Creation & Joining
  socket.on("joinPrivateChat", async (targetUserId) => {
    try {
      let conversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: userId } } },
            { participants: { some: { userId: targetUserId } } },
          ],
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            isGroup: false,
            participants: {
              create: [{ userId: userId as string }, { userId: targetUserId }],
            },
          },
        });
        console.log(`🏗️ Naya Private Room banaya: ${conversation.id}`);
      }

      socket.join(conversation.id);
      socket.emit("roomJoined", conversation.id);
      console.log(`🚪 User [${userId}] joined Room [${conversation.id}]`);
    } catch (error) {
      console.error("❌ Room join fail hua:", error);
    }
  });

  // 2. Sending Messages (Updated for Direct Routing)
  socket.on(
    "sendPrivateMessage",
    async (payload: { roomId: string; text: string; targetUserId: string }) => {
      try {
        const savedMessage = await prisma.message.create({
          data: {
            content: payload.text,
            senderId: userId as string,
            conversationId: payload.roomId,
          },
        });

        const broadcastPayload = {
          id: savedMessage.id,
          text: savedMessage.content,
          senderId: savedMessage.senderId,
          createdAt: savedMessage.createdAt,
        };

        // THE FIX: Message strictly Target User ke personal room mein bhejo, hawa mein nahi!
        socket
          .to(payload.targetUserId)
          .emit("receiveMessage", broadcastPayload);
        console.log(
          `🔒 Message routed directly to User [${payload.targetUserId}]`,
        );
      } catch (error) {
        console.error("❌ Message fail hua:", error);
      }
    },
  );

  // 4. Mark Room as Read (Watermark Logic)
  socket.on(
    "markAsRead",
    async (payload: { roomId: string; targetUserId: string }) => {
      try {
        if (!payload.roomId) return;

        // Tumhara 'lastReadAt' time abhi ke time par set kar do
        await prisma.participant.update({
          where: {
            userId_conversationId: {
              // Yeh tumhara @@unique constraint hai schema mein
              userId: userId as string,
              conversationId: payload.roomId,
            },
          },
          data: {
            lastReadAt: new Date(),
          },
        });

        // Samne wale ko batao ke message dekh liya gaya hai
        socket
          .to(payload.targetUserId)
          .emit("messagesRead", { roomId: payload.roomId });

        console.log(
          `👀 User [${userId}] marked Room [${payload.roomId}] as read.`,
        );
      } catch (error) {
        console.error("❌ Mark as read failed:", error);
      }
    },
  );

  // 3. Typing Indicators (Updated)
  socket.on("typing", (payload: { targetUserId: string }) => {
    socket.to(payload.targetUserId).emit("userTyping", userId);
  });

  socket.on("stopTyping", (payload: { targetUserId: string }) => {
    socket.to(payload.targetUserId).emit("userStoppedTyping", userId);
  });
};
