/**
 * Size limits for POST /api/chat. They live in their own dependency-free file so the browser can respect
 * them too (the server enforces them with zod in request.ts; the client trims to fit).
 */
export const MAX_MESSAGES = 30;
export const MAX_USER_MESSAGE_LENGTH = 4000;
/** Replies are longer than questions (a table of results), so they get more room. */
export const MAX_ASSISTANT_MESSAGE_LENGTH = 8000;
