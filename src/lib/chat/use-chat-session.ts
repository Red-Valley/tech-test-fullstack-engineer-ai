"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  chatReducer,
  emptyAssistantMessage,
  failureMessage,
  initialChatState,
  toRequestMessages,
  userMessage,
  type UiMessage,
} from "./conversation";
import { createEventParser, type ChatEvent } from "./protocol";

class ChatRequestError extends Error {}

/** The server's own explanation when it refused the request (bad input, missing API key, ...). */
async function describeFailure(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  return failureMessage(body, response.status);
}

/**
 * One chat conversation: the messages so far, whether a reply is streaming, and the actions on it.
 * Each question POSTs the conversation to /api/chat and folds the streamed events into the newest reply.
 */
export function useChatSession() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Streams a reply to `history`, which must end with the user's question. */
  const run = useCallback(async (history: UiMessage[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // Stop / reset / a newer question replace abortRef, which turns this run's late updates into no-ops.
    const isCurrent = () => abortRef.current === controller;

    dispatch({ type: "start", messages: [...history, emptyAssistantMessage()] });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toRequestMessages(history) }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new ChatRequestError(await describeFailure(response));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let batch: ChatEvent[] = [];
      let sawDone = false;
      const feed = createEventParser((event) => {
        if (event.type === "done") sawDone = true;
        batch.push(event);
      });

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        feed(decoder.decode(value, { stream: true }));
        // One state update per network chunk, not per event, keeps re-renders cheap while text streams in.
        if (batch.length > 0 && isCurrent()) dispatch({ type: "events", events: batch });
        batch = [];
      }

      if (!sawDone) throw new ChatRequestError("The connection was interrupted before the answer finished.");
      if (isCurrent()) dispatch({ type: "finish" });
    } catch (error) {
      if (!isCurrent()) return;
      dispatch({
        type: "fail",
        message:
          error instanceof ChatRequestError
            ? error.message
            : "Couldn't reach the server. Check that it is running and try again.",
      });
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      void run([...state.messages, userMessage(text)]);
    },
    [run, state.messages],
  );

  /** Re-asks the last question after a failed reply. */
  const retry = useCallback(() => {
    const withoutFailedReply = state.messages.at(-1)?.role === "assistant" ? state.messages.slice(0, -1) : state.messages;
    if (withoutFailedReply.at(-1)?.role === "user") void run(withoutFailedReply);
  }, [run, state.messages]);

  /** Stops the reply that is streaming; whatever text has arrived stays. */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "finish" });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "reset" });
  }, []);

  return { ...state, send, retry, stop, reset };
}

export type ChatSession = ReturnType<typeof useChatSession>;
