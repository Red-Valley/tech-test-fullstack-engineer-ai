import { Suspense } from "react";
import { connection } from "next/server";
import { Chat } from "@/components/chat";
import { getDb } from "@/lib/db";
import { createRepository } from "@/lib/games/repository";

export const metadata = { title: "Chat | Indie Games Dashboard" };

export default function ChatPage() {
  return (
    // Fill the viewport below the header (3.5rem) and the main padding (3rem); the chat card takes what is left.
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-[32rem] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Chat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ask questions in plain language. The assistant looks things up with tools instead of reading the whole
          catalog.
        </p>
      </div>
      <Suspense fallback={<div className="flex-1 animate-pulse rounded-xl bg-slate-200" aria-hidden="true" />}>
        <ChatWithSamples />
      </Suspense>
    </div>
  );
}

async function ChatWithSamples() {
  await connection();
  const { games } = createRepository(getDb()).query({
    sort_by: "monthly_revenue_usd",
    order: "desc",
    limit: 2,
  });

  const samples = ["Which game made the most revenue last month?", "How many games are rated above 4?"];
  if (games.length === 2) {
    samples.push(`Compare revenue of ${games[0].title} vs ${games[1].title}.`);
  }
  return <Chat samples={samples} />;
}
