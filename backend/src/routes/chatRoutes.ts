import express from "express";
import { getGlobalMessages } from "../controllers/chatController";

const router = express.Router();

// GET /api/chat/history
router.get("/history", getGlobalMessages);

export default router;
