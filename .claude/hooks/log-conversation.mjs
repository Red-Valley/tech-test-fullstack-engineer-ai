// Appends each finished turn (the user's prompt + Claude's text reply) to
// docs/conversation-log.md. Runs on the Stop hook and reads the session
// transcript. Thinking, tool calls and tool output are left out on purpose:
// the log is for reading the conversation, not replaying it.
// It must never block Claude, so any error is swallowed and it always exits 0.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  branchOf,
  cleanPrompt,
  gitCommonDir,
  isHarnessMessage,
  logRoot,
  timestamp,
} from './common.mjs';

const blocks = (content) =>
  typeof content === 'string'
    ? [{ type: 'text', text: content }]
    : Array.isArray(content)
      ? content
      : [];

const textOf = (content) =>
  blocks(content)
    .filter((b) => b?.type === 'text')
    .map((b) => b.text)
    .join('\n\n');

const promptText = (entry) => {
  const content = entry.message?.content;
  const text = cleanPrompt(textOf(content));
  const hasImage = blocks(content).some((b) => b?.type === 'image');
  return text || (hasImage ? '_(image)_' : '');
};

const isTypedPrompt = (entry) => {
  if (
    entry.type !== 'user' ||
    entry.isMeta ||
    entry.isCompactSummary ||
    entry.isVisibleInTranscriptOnly
  ) {
    return false;
  }
  if (blocks(entry.message?.content).some((b) => b?.type === 'tool_result')) return false;
  const text = promptText(entry);
  return text !== '' && !isHarnessMessage(text);
};

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const cwd = input.cwd || process.cwd();
  const entries = readFileSync(input.transcript_path, 'utf8')
    .split('\n')
    .flatMap((line) => {
      try {
        const entry = JSON.parse(line);
        return entry.isSidechain ? [] : [entry];
      } catch {
        return [];
      }
    });

  let start = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isTypedPrompt(entries[i])) {
      start = i;
      break;
    }
  }

  // A turn started by a background task has no new prompt. Logging the last prompt again
  // would duplicate it, so remember which prompt was logged last.
  const common = gitCommonDir(cwd);
  const stateFile = common ? path.join(common, 'claude-last-logged-prompt') : '';
  const promptId = start >= 0 ? String(entries[start].uuid ?? '') : '';
  const alreadyLogged =
    stateFile && promptId && existsSync(stateFile) && readFileSync(stateFile, 'utf8') === promptId;

  if (start >= 0 && !alreadyLogged) {
    const prompt = promptText(entries[start]);
    const reply = entries
      .slice(start + 1)
      .filter((e) => e.type === 'assistant')
      .map((e) => textOf(e.message?.content).trim())
      .filter(Boolean)
      .join('\n\n');

    const dir = path.join(logRoot(cwd), 'docs');
    const file = path.join(dir, 'conversation-log.md');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(file)) {
      appendFileSync(
        file,
        "# Conversation log\n\nEvery prompt and Claude's text reply, captured automatically by `.claude/hooks/log-conversation.mjs`. Do not edit.\n",
      );
    }

    const session = String(input.session_id ?? '').slice(0, 8);
    const quoted = prompt
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n');
    appendFileSync(
      file,
      `\n---\n\n## ${timestamp()} · ${branchOf(cwd)} · session ${session}\n\n**Prompt:**\n\n${quoted}\n\n**Claude:**\n\n${reply || '_(no text reply)_'}\n`,
    );
    if (stateFile && promptId) writeFileSync(stateFile, promptId);
  }
} catch {}

process.exit(0);
