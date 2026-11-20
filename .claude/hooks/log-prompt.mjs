// Appends every prompt sent to Claude Code to docs/prompts-raw.md.
// Runs on the UserPromptSubmit hook. It must never block a prompt,
// so any error is swallowed and the script always exits 0.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { branchOf, cleanPrompt, isHarnessMessage, logRoot, timestamp } from './common.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const prompt = cleanPrompt(String(input.prompt ?? ''));
  if (prompt && !isHarnessMessage(prompt)) {
    const cwd = input.cwd || process.cwd();
    const dir = path.join(logRoot(cwd), 'docs');
    const file = path.join(dir, 'prompts-raw.md');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(file)) {
      appendFileSync(
        file,
        '# Raw prompts\n\nCaptured automatically by `.claude/hooks/log-prompt.mjs`. Do not edit.\n',
      );
    }

    const session = String(input.session_id ?? '').slice(0, 8);
    appendFileSync(
      file,
      `\n## ${timestamp()} · ${branchOf(cwd)} · session ${session}\n\n${prompt}\n`,
    );
  }
} catch {}

process.exit(0);
