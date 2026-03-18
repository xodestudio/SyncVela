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

io.on("connection", (socket) => {
  // Yahan humne Type cast kiya taake TypeScript ko pata chale isme user data hai
  const authenticatedSocket = socket as AuthenticatedSocket;

  console.log(`🟢 New Client Connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`🔴 Client Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

// Prisma ab "Lazy" mode mein connect hoga (jab pehli API hit hogi)
server.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
  );
});
