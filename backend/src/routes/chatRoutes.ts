import express from "express";
import {
  getPrivateMessages,
  getUnreadCounts,
} from "../controllers/chatController";

const router = express.Router();

// GET /api/chat/:roomId/messages
router.get("/unread-counts", getUnreadCounts);
router.get("/:roomId/messages", getPrivateMessages);

export default router;
