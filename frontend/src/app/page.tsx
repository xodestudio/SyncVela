"use client";

import React, { useState, useEffect } from "react";
import { useSocket } from "@/src/providers/SocketProvider";
import { useChatStore, Message } from "@/src/store/chatStore";

export default function ChatPage() {
  const { socket, isConnected } = useSocket();
  const { messages, addMessage, setMessages, isLoading, setLoading } =
    useChatStore();
  const [inputText, setInputText] = useState("");

  // STATE HYDRATION: Pehli dafa page load hone par database se history lana
  useEffect(() => {
    const fetchChatHistory = async () => {
      setLoading(true); // Fetch shuru hone se pehle loading true kar do
      try {
        const response = await fetch("http://localhost:5000/api/chat/history");
        if (!response.ok) throw new Error("History fetch failed");

        const data = await response.json();

        // DATA TRANSFORMATION: Backend ke 'content' ko Frontend ke 'text' mein badalna
        const formattedHistory: Message[] = data.map((msg: any) => ({
          id: msg.id,
          text: msg.content,
          senderId: msg.senderId,
          createdAt: msg.createdAt,
        }));

        // Zustand store ko is purani history se bhar dena
        setMessages(formattedHistory);
      } catch (error) {
        console.error("❌ Failed to hydrate chat history:", error);
        setLoading(false); // Error aaye toh bhi loading hatani hai
      }
    };

    fetchChatHistory();
  }, [setMessages]);

  // FRONTEND LISTENER: Backend se aane wale naye messages ko sunna
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      console.log("📥 Naya message received:", message);
      addMessage(message);
    };

    socket.on("receiveMessage", handleNewMessage);

    // CLEANUP: Re-renders par multiple listeners attach hone se rokna
    return () => {
      socket.off("receiveMessage", handleNewMessage);
    };
  }, [socket, addMessage]);

  // EMITTER: Message likh kar backend ko bhejna
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    // Temporary payload (Jab tak auth system UI mein proper connect nahi hota)
    const payload: Message = {
      id: Math.random().toString(36).substring(7),
      text: inputText,
      senderId: "temporary-user-id",
      createdAt: new Date().toISOString(),
    };

    // 1. Apna message foran UI (Zustand) mein dikhao
    addMessage(payload);

    // 2. Backend ko bhej do taake wo baqi sab ko broadcast kare
    socket.emit("sendMessage", payload);

    setInputText("");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4">
      {/* Header & Status */}
      <div className="bg-white p-4 shadow rounded-t-lg flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">SyncVela Engine</h1>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          ></div>
          <span className="text-sm font-medium text-gray-600">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Chat History Area */}
      <div className="flex-1 bg-white border-x border-gray-200 p-4 overflow-y-auto flex flex-col gap-3">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-500">
              History load ho rahi hai...
            </span>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">
            Koi message nahi hai. Conversation shuru karo.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-blue-50 border border-blue-100 p-3 rounded-lg self-start max-w-[70%]"
            >
              <p className="text-gray-800">{msg.text}</p>
              <span className="text-xs text-gray-400 mt-1 block">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="bg-white p-4 shadow border-t rounded-b-lg flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Apna message type karo..."
          className="flex-1 border border-gray-300 text-gray-800 rounded-md p-2 focus:outline-none focus:border-blue-500"
          disabled={!isConnected}
        />
        <button
          type="submit"
          disabled={!isConnected}
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          Send
        </button>
      </form>
    </div>
  );
}
