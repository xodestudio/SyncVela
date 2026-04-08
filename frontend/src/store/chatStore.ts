import { create } from "zustand";

// 1. Strict TypeScript Interfaces
export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isLoading: boolean;

  // Actions
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setTypingStatus: (status: boolean) => void;
  setLoading: (status: boolean) => void;
}

// 2. The Zustand Engine
export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isTyping: false,
  isLoading: true, // Default true rakho kyunke page load hote hi data aana hai

  // Naya message aane par purane messages ke array mein add karna
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  // Pehli dafa chat load hone par database ki history set karna
  setMessages: (messages) => set({ messages }),

  // Typing indicator ko toggle karna
  setTypingStatus: (status) => set({ isTyping: status }),

  // Loading state ko toggle karna
  setLoading: (status) => set({ isLoading: status }),
}));
