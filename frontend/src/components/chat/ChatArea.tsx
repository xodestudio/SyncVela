import React, { useState } from "react";
import { useSocket } from "@/src/providers/SocketProvider";
import { useChatStore, Message } from "@/src/store/chatStore";
import { useAuthStore } from "@/src/store/authStore";

export default function ChatArea() {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const { messages, addMessage, selectedUser, activeRoomId, isTyping } =
    useChatStore();

  const [inputText, setInputText] = useState("");
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket || !activeRoomId || !selectedUser) return;

    // UPDATE: targetUserId pass karo
    socket.emit("typing", { targetUserId: selectedUser.id });

    if (typingTimeout) clearTimeout(typingTimeout);

    const newTimeout = setTimeout(() => {
      socket.emit("stopTyping", { targetUserId: selectedUser.id });
    }, 2000);
    setTypingTimeout(newTimeout);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !activeRoomId || !selectedUser) return;

    // UPDATE: Payload mein targetUserId lazmi bhejni hai
    const payload = {
      roomId: activeRoomId,
      text: inputText,
      targetUserId: selectedUser.id,
    };

    const optimisticMsg: Message = {
      id: Math.random().toString(36).substring(7),
      text: inputText,
      senderId: user?.id || "unknown",
      createdAt: new Date().toISOString(),
    };
    addMessage(optimisticMsg);

    socket.emit("sendPrivateMessage", payload);
    setInputText("");

    socket.emit("stopTyping", { targetUserId: selectedUser.id });
    if (typingTimeout) clearTimeout(typingTimeout);
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-300 mb-2">
            SyncVela Private Chat
          </h2>
          <p className="text-gray-400">
            Select a contact from the sidebar to start messaging.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="bg-white p-4 shadow-sm border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">{selectedUser.name}</h2>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
          {activeRoomId ? "Room Secured 🔒" : "Securing Room..."}
        </span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">
            Start the conversation with {selectedUser.name}
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = user?.id === msg.senderId;
            return (
              <div
                key={msg.id}
                className={`p-3 rounded-lg max-w-[70%] flex flex-col ${
                  isMe
                    ? "bg-blue-600 text-white self-end rounded-br-none"
                    : "bg-gray-200 text-gray-800 self-start rounded-bl-none"
                }`}
              >
                <p>{msg.text}</p>
                <span
                  className={`text-[10px] mt-1 block ${isMe ? "text-blue-200" : "text-gray-500"}`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="p-3 rounded-lg bg-gray-100 text-gray-500 self-start rounded-bl-none animate-pulse text-sm font-medium">
            {selectedUser?.name} is typing...
          </div>
        )}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="bg-white p-4 border-t border-gray-200 flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={`Message ${selectedUser.name}...`}
          className="flex-1 border border-gray-300 rounded-md p-2 text-black focus:outline-none focus:border-blue-500"
          disabled={!activeRoomId}
        />
        <button
          type="submit"
          disabled={!activeRoomId}
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400"
        >
          Send
        </button>
      </form>
    </div>
  );
}
