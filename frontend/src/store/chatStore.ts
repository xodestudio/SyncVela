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
  targetLastReadAt: string | null;
  hasMore: boolean; // Kya aur purane messages baqi hain?
  nextCursor: string | null; // Agli bar kahan se api hit karni hai
  isLoadingMore: boolean;

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
  setTargetLastReadAt: (time: string | null) => void;
  setPagination: (hasMore: boolean, cursor: string | null) => void;
  prependMessages: (olderMessages: Message[]) => void;
  setIsLoadingMore: (loading: boolean) => void;
  moveUserToTop: (userId: string) => void;
  resetChat: () => void;
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
  targetLastReadAt: null,
  hasMore: false,
  nextCursor: null,
  isLoadingMore: false,

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

  setTargetLastReadAt: (time) => set({ targetLastReadAt: time }),

  setPagination: (hasMore, cursor) => set({ hasMore, nextCursor: cursor }),

  // NAYA: Purane messages array ke shuru mein (top par) lagane hain
  prependMessages: (olderMessages) =>
    set((state) => ({
      messages: [...olderMessages, ...state.messages],
    })),

  setIsLoadingMore: (loading) => set({ isLoadingMore: loading }),

  moveUserToTop: (userId) =>
    set((state) => {
      // 1. Current user ka index dhoondo
      const userIndex = state.users.findIndex((u) => u.id === userId);

      // 2. Agar user nahi mila (-1) ya pehle se hi top par hai (0), toh state change mat karo
      if (userIndex === -1 || userIndex === 0) return state;

      // 3. STRICT COPY: Array ki deep copy banao taake React UI ko refresh kare
      const newUsersList = [...state.users];

      // 4. User ko uski jagah se nikalo
      const [extractedUser] = newUsersList.splice(userIndex, 1);

      // 5. User ko bilkul top (shuru) mein daal do
      newUsersList.unshift(extractedUser);

      return { users: newUsersList };
    }),

  setSelectedUser: (user) =>
    set((state) => ({
      selectedUser: user,
      messages: [],
      activeRoomId: null,
      targetLastReadAt: null,
      hasMore: false,
      nextCursor: null,
      unreadCounts: { ...state.unreadCounts, [user?.id || ""]: 0 },
    })),

  resetChat: () =>
    set({
      users: [],
      selectedUser: null,
      messages: [],
      onlineUsers: [],
      unreadCounts: {},
      activeRoomId: null,
      isTyping: false,
      hasMore: false,
      nextCursor: null,
      isLoadingMore: false,
      targetLastReadAt: null,
    }),
}));
