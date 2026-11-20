import { describe, expect, it } from "vitest";
import { apiError, scriptedAnthropic } from "@/test/anthropic-mock";
import { friendlyError } from "./errors";

/** Provokes a real SDK error by answering the request the way the API would, then maps it. */
async function messageFor(turn: () => Response): Promise<string> {
  const { client } = scriptedAnthropic([turn]);
  try {
    await client.messages.create({ model: "m", max_tokens: 1, messages: [{ role: "user", content: "hi" }] });
  } catch (error) {
    return friendlyError(error);
  }
  throw new Error("expected the request to fail");
}

describe("friendlyError", () => {
  it("tells you what to do about a rejected key", async () => {
    const message = await messageFor(apiError(401, "authentication_error", "invalid x-api-key"));
    expect(message).toMatch(/rejected the API key/);
    expect(message).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("explains a wrong model name", async () => {
    expect(await messageFor(apiError(404, "not_found_error", "model: nope"))).toMatch(/ANTHROPIC_MODEL/);
  });

  it("explains rate limits and permission problems", async () => {
    expect(await messageFor(apiError(429, "rate_limit_error", "slow down"))).toMatch(/rate-limiting/);
    expect(await messageFor(apiError(403, "permission_error", "no"))).toMatch(/isn't allowed/);
  });

  it("passes on the API's own explanation for other errors, such as an empty credit balance", async () => {
    const message = await messageFor(apiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API."));
    expect(message).toBe("Anthropic returned an error (400): Your credit balance is too low to access the Anthropic API.");
  });

  it("reports an unreachable API as a network problem", async () => {
    const message = await messageFor(() => {
      throw new TypeError("fetch failed");
    });
    expect(message).toMatch(/Couldn't reach the Anthropic API/);
  });

  it("keeps unknown errors generic so internals never reach the chat", () => {
    const message = friendlyError(new Error("ECONNRESET at 10.0.0.5:5432 password=hunter2"));
    expect(message).toBe("Something went wrong while generating the answer. Please try again.");
  });
});
