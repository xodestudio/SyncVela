import { PrismaClient } from "@prisma/client";

// PrismaClient ka ek single instance banaya
const prisma = new PrismaClient({
  // Development mode mein queries log karne ke liye taake debugging aasan ho
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

export default prisma;
