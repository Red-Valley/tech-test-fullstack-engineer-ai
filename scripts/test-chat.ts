// REQUIRES: `npm run dev` running on http://localhost:3000.
// POSTs two UIMessages to /api/chat, prints the streamed text and tool events,
// and exits 0 only if both requests returned 200 and contained at least one
// tool call event in the SSE stream.

const ENDPOINT = 'http://localhost:3000/api/chat';

interface UIMessageOut {
  id: string;
  role: 'user';
  parts: Array<{ type: 'text'; text: string }>;
}

const MESSAGES: string[] = [
  'Which game made the most revenue?',
  'Compare Hollow Knight and Celeste.',
];

function makeBody(text: string, id: string): { messages: UIMessageOut[] } {
  return {
    messages: [{ id, role: 'user', parts: [{ type: 'text', text }] }],
  };
}

interface StreamResult {
  status: number;
  sawToolCall: boolean;
}

async function streamOne(text: string, label: string): Promise<StreamResult> {
  const id = `test-${label}-${Date.now()}`;
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(makeBody(text, id)),
  });

  console.log(`\n--- BEGIN OF MESSAGE ${label} ---`);
  console.log(`USER: ${text}`);

  if (!res.ok || !res.body) {
    const errBody = await res.text().catch(() => '<no body>');
    console.error(`HTTP ${res.status}: ${errBody}`);
    console.log(`--- END OF MESSAGE ${label} ---\n`);
    return { status: res.status, sawToolCall: false };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawToolCall = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        const type = parsed.type;
        if (typeof type !== 'string') continue;
        if (type.startsWith('tool-')) {
          sawToolCall = true;
          const toolName =
            typeof parsed.toolName === 'string' ? parsed.toolName : '';
          console.log(`\n[TOOL EVENT] ${type}${toolName ? ' ' + toolName : ''}`);
        } else if (type === 'text-delta' && typeof parsed.delta === 'string') {
          process.stdout.write(parsed.delta);
        }
      } catch {
        // Non-JSON SSE line; ignore.
      }
    }
  }

  console.log(`\n--- END OF MESSAGE ${label} ---\n`);
  return { status: res.status, sawToolCall };
}

async function main(): Promise<void> {
  let exitCode = 0;
  for (let i = 0; i < MESSAGES.length; i++) {
    const label = String(i + 1);
    const result = await streamOne(MESSAGES[i], label);
    if (result.status !== 200) {
      console.error(`Message ${label} returned status ${result.status}`);
      exitCode = 1;
    }
    if (!result.sawToolCall) {
      console.error(`Message ${label} did not include any tool call`);
      exitCode = 1;
    }
  }

  if (exitCode === 0) {
    console.log('Both messages completed successfully');
  }
  process.exit(exitCode);
}

main();
