// Shared helpers for the logging hooks. Nothing here may throw past the callers' try/catch
// or hang, so every git call has a timeout and a fallback.
import { execSync } from 'node:child_process';
import path from 'node:path';

const git = (args, cwd) => {
  try {
    return execSync(`git ${args}`, { cwd, timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
};

// The shared .git dir of the main checkout, also when the session runs inside a worktree.
export const gitCommonDir = (cwd) => git('rev-parse --path-format=absolute --git-common-dir', cwd);

// Logs always go to the main checkout. If each worktree wrote its own copy, the append-only
// logs would conflict on every merge.
export const logRoot = (cwd) => {
  const common = gitCommonDir(cwd);
  return common ? path.dirname(common) : process.env.CLAUDE_PROJECT_DIR || cwd;
};

// Messages the harness delivers through the user role: subagent hand-backs, background-task
// notifications, interrupts, slash-command echoes. None of them were typed by the user.
const HARNESS_PREFIXES = [
  '<agent-message',
  '<task-notification>',
  '<command-',
  '<local-command-',
  '[Request interrupted',
];

// The harness adds context to a prompt (system reminders, IDE state); keep only what was typed.
export const cleanPrompt = (text) =>
  text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<ide_[a-z_]+>[\s\S]*?<\/ide_[a-z_]+>/g, '')
    .trim();

export const isHarnessMessage = (text) => HARNESS_PREFIXES.some((p) => text.startsWith(p));

export const branchOf = (cwd) => git('rev-parse --abbrev-ref HEAD', cwd) || 'unknown';

export const timestamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
