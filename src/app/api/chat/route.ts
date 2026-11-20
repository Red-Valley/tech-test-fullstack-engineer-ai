import { chatHandler } from '@/server/ai/chat';

export const runtime = 'nodejs';
// Tool loops can take several model round-trips.
export const maxDuration = 60;

export const POST = chatHandler;
