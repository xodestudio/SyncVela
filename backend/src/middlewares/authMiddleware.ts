import { Socket } from "socket.io";
import jwt from "jsonwebtoken";

// 1. TypeScript Override: Standard Socket ko extend karke apni custom property add ki
export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
  };
}

// 2. The Middleware Engine
export const socketAuthMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
) => {
  // Handshake ke time frontend token ko 'auth' object mein bhejega
  // FALLBACK ARCHITECTURE: Pehle 'auth' object check karo, agar na mile toh 'Headers' mein Bearer token dhoondo
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(" ")[1];

  if (!token) {
    console.error(
      `❌ Socket Connection Rejected: No token provided (Socket ID: ${socket.id})`,
    );
    return next(new Error("Authentication error: Token missing"));
  }

  try {
    // Token ko apni secret key se verify karna
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };

    // Agar token valid hai, toh user ki ID is socket session ke sath hamesha ke liye chipka do
    socket.user = { userId: decoded.userId };

    console.log(
      `✅ Socket Authenticated: User ${decoded.userId} connected (Socket ID: ${socket.id})`,
    );

    // Connection allow karo
    next();
  } catch (error) {
    console.error(
      `❌ Socket Connection Rejected: Invalid token (Socket ID: ${socket.id})`,
    );
    return next(new Error("Authentication error: Invalid or expired token"));
  }
};
