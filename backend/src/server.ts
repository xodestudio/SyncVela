import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./config/db";
import {
  socketAuthMiddleware,
  AuthenticatedSocket,
} from "./middlewares/authMiddleware";

// ROUTES IMPORT
import authRoutes from "./routes/authRoutes";
import chatRoutes from "./routes/chatRoutes";

dotenv.config();

const app = express();
const server = http.createServer(app);

// MIDDLEWARE
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());

// ROUTE MOUNTING (The Missing Piece)
// Ab authRoutes ki saari APIs '/api/auth' ke aage lagengi
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// SOCKET.IO INITIALIZATION
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "DevSync API is running smoothly." });
});

// THE GATEKEEPER: Yeh line har connection ko roke gi aur token check karegi
io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  const authenticatedSocket = socket as AuthenticatedSocket;
  const userId = authenticatedSocket.user?.userId;

  console.log(`🟢 Real-Time Engine Active For User: ${userId}`);

  // 1. FRONTEND SE MESSAGE RECEIVE KARNA
  socket.on("sendMessage", async (payload) => {
    console.log(`📨 Naya Message [${userId}]: ${payload.text}`);

    try {
      // A. "Global Chat" Room dhoondo ya naya banao (Fallback architecture)
      let globalConversation = await prisma.conversation.findFirst({
        where: { name: "Global Chat" },
      });

      if (!globalConversation) {
        globalConversation = await prisma.conversation.create({
          data: { name: "Global Chat", isGroup: true },
        });
      }

      // B. Message ko NeonDB mein save karna (Permanent Storage)
      const savedMessage = await prisma.message.create({
        data: {
          content: payload.text, // Schema mein 'content' hai, frontend se 'text' aa raha hai
          senderId: userId as string, // JWT Token se aane wali authentic ID
          conversationId: globalConversation.id, // Room ki ID
        },
      });

      // C. NETWORK PAR BROADCAST KARNA (Lekin ab fake ID nahi, asli Database ID ke sath)
      const broadcastPayload = {
        id: savedMessage.id,
        text: savedMessage.content,
        senderId: savedMessage.senderId,
        createdAt: savedMessage.createdAt,
      };

      socket.broadcast.emit("receiveMessage", broadcastPayload);
      console.log(`💾 Message Saved to DB & Broadcasted: ${savedMessage.id}`);
    } catch (error) {
      console.error("❌ Failed to save message to Database:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 User Disconnected: ${userId}`);
  });
});

const PORT = process.env.PORT || 5000;

// Prisma ab "Lazy" mode mein connect hoga (jab pehli API hit hogi)
server.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
  );
});
