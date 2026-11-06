import type { Metadata } from 'next';
import { Chat } from '@/components/chat/Chat';
import { getSuggestedPrompts } from '@/lib/ai/suggested-prompts';

export const metadata: Metadata = { title: 'Chat | Indie Games Dashboard' };

// The suggested prompts read the catalog, so they must not be frozen at build time.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function ChatPage() {
  return (
    // 57px is the height of the Nav, so that only the message list scrolls.
    <main className="mx-auto flex h-[calc(100dvh-57px)] w-full max-w-3xl flex-col px-4 pt-6 pb-4 sm:px-6">
      <h1 className="sr-only">Chat</h1>
      <Chat suggestedPrompts={getSuggestedPrompts()} />
    </main>
  );
}
