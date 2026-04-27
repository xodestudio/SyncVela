import React, { useState, useRef, useEffect } from "react";
import { useSocket } from "@/src/providers/SocketProvider";
import { useChatStore, Message } from "@/src/store/chatStore";
import { useAuthStore } from "@/src/store/authStore";

export default function ChatArea() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuthStore();
  const {
    messages,
    addMessage,
    selectedUser,
    activeRoomId,
    isTyping,
    targetLastReadAt,
    hasMore,
    nextCursor,
    isLoadingMore,
    setPagination,
    prependMessages,
    setIsLoadingMore,
  } = useChatStore();

  const [inputText, setInputText] = useState("");
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [isInitialLoad, setIsInitialLoad] = useState(false);

  // NAYA: Scroll container ka reference
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket || !activeRoomId || !selectedUser) return;

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

    // UX FIX: Naya message bhejte hi auto-scroll to bottom
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // NAYA: The Infinite Scroll Engine
  const handleScroll = async () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight } = scrollContainerRef.current;

    if (
      scrollTop === 0 &&
      hasMore &&
      !isLoadingMore &&
      nextCursor &&
      activeRoomId
    ) {
      setIsLoadingMore(true);
      const previousScrollHeight = scrollHeight;

      try {
        const res = await fetch(
          `http://localhost:5000/api/chat/${activeRoomId}/messages?cursor=${nextCursor}`,
        );
        if (res.ok) {
          const data = await res.json();
          const formattedOlder: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            text: msg.content,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
          }));

          prependMessages(formattedOlder);
          setPagination(data.hasMore, data.nextCursor);

          // Scroll jump ko rokne ki logic
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop =
                scrollContainerRef.current.scrollHeight - previousScrollHeight;
            }
          }, 0);
        }
      } catch (err) {
        console.error("Failed to load older messages", err);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  // 1. Jab bhi room change ho, flag ko true kar do
  useEffect(() => {
    if (activeRoomId) {
      setIsInitialLoad(true);
    }
  }, [activeRoomId]);

  // 2. Jab messages load ho jayen, aur agar yeh initial load tha, toh bottom par phenk do
  useEffect(() => {
    if (isInitialLoad && messages.length > 0) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
      }
      setIsInitialLoad(false); // Flag band kar do taake infinite scroll par jump na mare
    }
  }, [messages, isInitialLoad]);

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

      {/* YAHAN REF AUR ONSCROLL LAGA HAI */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-gray-50"
      >
        {isLoadingMore && (
          <div className="text-center p-2 text-xs text-blue-500 font-medium">
            Loading older messages...
          </div>
        )}

        {messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">
            Start the conversation with {selectedUser.name}
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = user?.id === msg.senderId;
            const isRead =
              isMe &&
              targetLastReadAt &&
              new Date(msg.createdAt) <= new Date(targetLastReadAt);

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
                <div
                  className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${isMe ? "text-blue-200" : "text-gray-500"}`}
                >
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  {isMe && <span>{isRead ? "✓✓" : "✓"}</span>}
                </div>
              </div>
            );
          })
        )}

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
          placeholder={
            isConnected
              ? `Message ${selectedUser.name}...`
              : "Reconnecting to server..."
          }
          className={`flex-1 border rounded-md p-2 text-black focus:outline-none ${!isConnected ? "bg-gray-100 border-red-300 cursor-not-allowed" : "border-gray-300 focus:border-blue-500"}`}
          disabled={!activeRoomId || !isConnected} // UPDATE
        />
        <button
          type="submit"
          disabled={!activeRoomId || !isConnected} // UPDATE
          className={`px-6 py-2 rounded-md font-medium text-white transition-colors ${
            !activeRoomId || !isConnected
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Send
        </button>
      </form>
    </div>
  );
}
