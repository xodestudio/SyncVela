"use client";

import React, { useState, useEffect } from "react";
import { useSocket } from "@/src/providers/SocketProvider";
import { useChatStore, Message } from "@/src/store/chatStore";
import { useAuthStore } from "@/src/store/authStore";
import Auth from "@/src/components/Auth";

// Naye Components Import karo
import Sidebar from "@/src/components/chat/Sidebar";
import ChatArea from "@/src/components/chat/ChatArea";

export default function ChatPage() {
  const { socket } = useSocket();
  const {
    setUsers,
    setActiveRoomId,
    addMessage,
    setMessages,
    setTypingStatus,
    setOnlineUsers,
  } = useChatStore();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // 1. Initial Data Fetching (Users & Unread Counts)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const fetchInitialData = async () => {
      try {
        const [usersRes, unreadRes] = await Promise.all([
          fetch(`http://localhost:5000/api/users?currentUserId=${user.id}`),
          fetch(
            `http://localhost:5000/api/chat/unread-counts?userId=${user.id}`,
          ),
        ]);

        if (usersRes.ok) setUsers(await usersRes.json());
        if (unreadRes.ok) {
          // Store mein naya data dal do
          const counts = await unreadRes.json();
          useChatStore.setState({ unreadCounts: counts });
        }
      } catch (error) {
        console.error("❌ Failed to fetch initial data", error);
      }
    };
    fetchInitialData();
  }, [isAuthenticated, user?.id, setUsers]);

  // 2. Global Socket Listeners (Engineers yahan ghalti karte hain, inko layout level par hona chahiye)
  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = async (roomId: string) => {
      setActiveRoomId(roomId);

      // NAYA: Jaise hi kamre mein ghuso, backend ko watermark update karne ka bol do
      const currentSelectedUser = useChatStore.getState().selectedUser;
      if (currentSelectedUser) {
        socket.emit("markAsRead", {
          roomId,
          targetUserId: currentSelectedUser.id,
        });
        useChatStore.getState().clearUnread(currentSelectedUser.id);
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/chat/${roomId}/messages`,
        );
        if (response.ok) {
          const data = await response.json();
          const formattedHistory: Message[] = data.map((msg: any) => ({
            id: msg.id,
            text: msg.content,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
          }));
          setMessages(formattedHistory);
        }
      } catch (error) {
        console.error("❌ Failed to fetch room history", error);
      }
    };

    const handleNewMessage = (message: Message) => {
      // Zustand ka naya pattern (Bina stale state ke current state nikalna)
      const currentSelectedUser = useChatStore.getState().selectedUser;

      // Agar main pehle se usi user ke room mein hun, toh message chat mein add karo
      if (currentSelectedUser?.id === message.senderId) {
        addMessage(message);
      }
      // Agar main kisi aur room mein hun (ya kisi bhi room mein nahi hun), toh us bande ka badge increment karo
      else {
        useChatStore.getState().incrementUnread(message.senderId);
      }
    };

    const handleTyping = () => setTypingStatus(true);
    const handleStopTyping = () => setTypingStatus(false);

    socket.on("roomJoined", handleRoomJoined);
    socket.on("receiveMessage", handleNewMessage);
    socket.on("userTyping", handleTyping);
    socket.on("userStoppedTyping", handleStopTyping);
    socket.on("getOnlineUsers", (userIds: string[]) => {
      setOnlineUsers(userIds);
    });

    return () => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("receiveMessage", handleNewMessage);
      socket.off("userTyping", handleTyping);
      socket.off("userStoppedTyping", handleStopTyping);
      socket.off("getOnlineUsers");
    };
  }, [socket, setActiveRoomId, addMessage, setMessages, setTypingStatus]);

  if (!mounted) return null;
  if (!isAuthenticated) return <Auth />;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <ChatArea />
    </div>
  );
}
