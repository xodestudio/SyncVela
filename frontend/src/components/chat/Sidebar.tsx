import React from "react";
import { useSocket } from "@/src/providers/SocketProvider";
import { useChatStore, SidebarUser } from "@/src/store/chatStore";
import { useAuthStore } from "@/src/store/authStore";

export default function Sidebar() {
  const { socket, isConnected } = useSocket();
  const {
    users,
    selectedUser,
    setSelectedUser,
    onlineUsers,
    unreadCounts,
    resetChat,
  } = useChatStore();
  const { user, logout } = useAuthStore();

  const handleUserSelect = (targetUser: SidebarUser) => {
    setSelectedUser(targetUser);
    if (socket) {
      socket.emit("joinPrivateChat", targetUser.id);

      // NAYA: Backend ko batao ke maine chat khol li hai, inko read mark kardo
      // Dhyan rahe ke Room ID ka logic handle karna hoga, ya seedha targetUserId bhej do
      // Hum direct event fire karenge jab roomId mil jaye. Behtar hai isko hum chatStore action mein wrap karein.
    }
  };

  const handleStrictLogout = () => {
    resetChat(); // Pehle chat ki memory wipe karo (Security First)
    logout(); // Phir user ko auth se bahar phainko
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-100 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-gray-800">{user?.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            ></div>
            <span className="text-xs text-gray-500">
              {isConnected ? "Online" : "Connecting..."}
            </span>
          </div>
        </div>
        <button
          onClick={handleStrictLogout}
          className="text-xs text-red-500 hover:underline"
        >
          Logout
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider p-4">
          Contacts
        </h3>
        {users.map((u) => {
          const isOnline = onlineUsers.includes(u.id);
          const unreadCount = unreadCounts[u.id] || 0; // Check karo ke koi unread message hai?

          return (
            <div
              key={u.id}
              onClick={() => handleUserSelect(u)}
              className={`p-4 cursor-pointer border-b border-gray-50 hover:bg-blue-50 transition-colors flex justify-between items-center ${
                selectedUser?.id === u.id
                  ? "bg-blue-100 border-l-4 border-blue-600"
                  : ""
              }`}
            >
              <div>
                <p className="font-medium text-gray-800">{u.name}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>

              {/* THE STATUS INDICATORS */}
              <div className="flex items-center gap-3">
                {/* Agar unread messages hain, toh Laal Badge dikhao */}
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
                {/* The Green Dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-300"}`}
                ></div>
              </div>
            </div>
          );
        })}
        {users.length === 0 && (
          <p className="p-4 text-sm text-gray-400">No other users found.</p>
        )}
      </div>
    </div>
  );
}
