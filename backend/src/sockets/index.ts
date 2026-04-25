import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import {
  socketAuthMiddleware,
  AuthenticatedSocket,
} from "../middlewares/authMiddleware";
import { handleChatEvents } from "./chatHandler";

// THE PRESENCE REGISTRY (In-Memory)
// Yeh Set un saare user IDs ko track karega jo is waqt socket se connected hain
const onlineUsers = new Set<string>();

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.user?.userId;

    if (!userId) return;

    console.log(`🟢 User Online: ${userId} (Socket ID: ${socket.id})`);

    // NAYA LOGIC: User ko uske personal ID wale kamre mein lock kar do
    socket.join(userId);

    // 1. User ko online list mein add karo
    onlineUsers.add(userId);

    // 2. Poori dunya (saare connected clients) ko batao ke ab kon kon online hai
    io.emit("getOnlineUsers", Array.from(onlineUsers));

    handleChatEvents(io, authSocket);

    // 3. Jaise hi connection toote, list se nikalo aur sab ko update do
    socket.on("disconnect", () => {
      console.log(`🔴 User Offline: ${userId}`);
      onlineUsers.delete(userId);
      io.emit("getOnlineUsers", Array.from(onlineUsers));
    });
  });

  return io;
};
