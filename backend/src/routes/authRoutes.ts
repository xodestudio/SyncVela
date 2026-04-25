import express from "express";
import { registerUser, loginUser } from "../controllers/authController";

const router = express.Router();

// POST request jab /api/auth/register par aayegi, toh registerUser function chalega
router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;
