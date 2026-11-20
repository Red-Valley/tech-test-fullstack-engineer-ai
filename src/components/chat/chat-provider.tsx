"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useChatSession, type ChatSession } from "@/lib/chat/use-chat-session";

const ChatContext = createContext<ChatSession | null>(null);

/**
 * Lives in the root layout so the conversation survives navigating to the dashboard and back
 * (client-side navigation keeps the layout mounted). A full page reload starts a fresh chat.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const session = useChatSession();
  return <ChatContext.Provider value={session}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatSession {
  const session = useContext(ChatContext);
  if (!session) throw new Error("useChat must be used inside <ChatProvider>");
  return session;
}
