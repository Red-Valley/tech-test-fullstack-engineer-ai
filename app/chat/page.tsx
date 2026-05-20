import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { ChatView } from '@/components/chat-view';

export const metadata: Metadata = { title: 'Chat' };

export default function ChatPage(): ReactElement {
  return <ChatView />;
}
