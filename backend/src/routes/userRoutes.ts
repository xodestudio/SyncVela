import express from "express";
import { getUsersForSidebar } from "../controllers/userController";

const router = express.Router();

// GET /api/users?currentUserId=xyz
router.get("/", getUsersForSidebar);

export default router;
