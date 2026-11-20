import type { Metadata } from "next";
import { ChatView } from "@/components/chat/chat-view";
import { getGames } from "@/lib/db";

export const metadata: Metadata = { title: "Chat · Indie Games Catalog" };

// The suggestions use real titles from the catalog, so they stay valid as games are added or removed.
export const dynamic = "force-dynamic";

export default function ChatPage() {
  const { games: topEarners } = getGames().list({ sortBy: "monthly_revenue_usd", order: "desc", limit: 2 });

  const suggestions = [
    "Which game made the most revenue last month?",
    "How many games are rated above 4?",
    topEarners.length === 2
      ? `Compare revenue of ${topEarners[0].title} vs ${topEarners[1].title}`
      : "Compare the revenue of two games",
    "What is the average rating for each genre?",
  ];

  return <ChatView suggestions={suggestions} />;
}
