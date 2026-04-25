import { create } from "zustand";

export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

export interface SidebarUser {
  id: string;
  name: string;
  email: string;
}

interface ChatState {
  messages: Message[];
  users: SidebarUser[]; // Sidebar ke contacts
  selectedUser: SidebarUser | null; // Jis se baat ho rahi hai
  activeRoomId: string | null; // Private kamre ki ID
  isLoading: boolean;
  isTyping: boolean;
  onlineUsers: string[];
  unreadCounts: Record<string, number>;

  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setUsers: (users: SidebarUser[]) => void;
  setSelectedUser: (user: SidebarUser | null) => void;
  setActiveRoomId: (id: string | null) => void;
  setLoading: (status: boolean) => void;
  setTypingStatus: (status: boolean) => void;
  setOnlineUsers: (userIds: string[]) => void;
  incrementUnread: (userId: string) => void;
  clearUnread: (userId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  users: [],
  selectedUser: null,
  activeRoomId: null,
  isLoading: false,
  isTyping: false,
  onlineUsers: [],
  unreadCounts: {},

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages, isLoading: false }),
  setUsers: (users) => set({ users }),
  setActiveRoomId: (id) => set({ activeRoomId: id }),
  setLoading: (status) => set({ isLoading: status }),
  setTypingStatus: (status) => set({ isTyping: status }),
  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),
  incrementUnread: (userId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1,
      },
    })),

  clearUnread: (userId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: 0,
      },
    })),
  setSelectedUser: (user) =>
    set((state) => ({
      selectedUser: user,
      messages: [],
      activeRoomId: null,
      unreadCounts: { ...state.unreadCounts, [user?.id || ""]: 0 }, // Click karte hi badge clear!
    })),
}));
