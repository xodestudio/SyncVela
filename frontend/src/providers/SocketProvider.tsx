"use client"; // Next.js ko batana ke yeh strictly browser mein chalega

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// TypeScript Definition
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // ABHI KE LIYE: Hum Postman wala token hardcode karenge testing ke liye.
    // Asli app mein yeh localStorage ya Next.js cookies se aayega.
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbW5vNDd3cGYwMDAwcGN4NGJrYjhsMzd1IiwiaWF0IjoxNzc1NTM1ODgwLCJleHAiOjE3NzYxNDA2ODB9.i_2bGPlBwcBg8Oi0NyvuI_WEYy2-pPqMMBSsK4nhIxI";

    // Connection establish karna (Backend ka URL)
    const socketInstance = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
      {
        auth: {
          token: token, // Frontend strictly 'auth' object use karta hai (Backend isay catch karega)
        },
      },
    );

    socketInstance.on("connect", () => {
      console.log("🟢 Frontend Connected to WebSocket Engine");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("🔴 Frontend Disconnected");
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // CLEANUP: The Senior Move. Agar component unmount ho, toh connection leak na ho.
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
