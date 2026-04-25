import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";

// Routes Import
import authRoutes from "./routes/authRoutes";
import chatRoutes from "./routes/chatRoutes";
import userRoutes from "./routes/userRoutes";

// Socket Engine Import
import { initSocket } from "./sockets";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "SyncVela API is running smoothly." });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running in development mode on port ${PORT}`);
});
