import express from "express";
import { registerUser } from "../controllers/authController";

const router = express.Router();

// POST request jab /api/auth/register par aayegi, toh registerUser function chalega
router.post("/register", registerUser);

export default router;
