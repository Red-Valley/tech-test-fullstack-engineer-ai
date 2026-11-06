import type { Metadata } from 'next';
import { Chat } from '@/components/chat/Chat';
import { getAskDraft, getSuggestedPrompts } from '@/lib/ai/suggested-prompts';

export const metadata: Metadata = { title: 'Chat | Indie Games Dashboard' };

// The suggested prompts read the catalog, so they must not be frozen at build time.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function ChatPage({ searchParams }: PageProps<'/chat'>) {
  const { ask } = await searchParams;

  return (
    // 4rem is the height of the header, so that only the message list scrolls.
    <main className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col px-4 pt-6 pb-4 sm:px-6">
      <h1 className="sr-only">Chat</h1>
      <Chat suggestedPrompts={getSuggestedPrompts()} initialDraft={getAskDraft(ask)} />
    </main>
  );
}
