// `npm run eval [-- --runs 3] [-- --only id1,id2]`: Level 3 evals (ARCHITECTURE.md §7.3).
// Sends every case to the running app's /api/chat as a fresh conversation, grades the streamed
// answer deterministically, prints console tables and writes evals/results/latest.{json,md}.
//
// Start the app on the eval DB first:
//   npm run eval:db && DB_PATH=data/eval.db npm run dev
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { chatModelId, chatProvider } from '@/server/ai/model';
import { openDatabase } from '@/server/db/client';
import { createGamesRepository } from '@/server/repositories/games.repository';
import { createGamesService } from '@/server/services/games.service';
import { CASES, type EvalCase } from './cases';
import { EVAL_DB_PATH } from './config';
import { grade, type Expectation, type ToolCall } from './grade';

// Same .env.local as the app, so the model label below matches what the server runs (when the
// server was started from this folder without overriding LLM_PROVIDER / LLM_MODEL).
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const BASE_URL = (process.env.EVAL_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const THRESHOLD = Number(process.env.EVAL_THRESHOLD || 0.9);
// Free-tier providers rate-limit; a short pause between requests avoids most 429s.
const DELAY_MS = Number(process.env.EVAL_DELAY_MS || 1500);
const MAX_ATTEMPTS = 3;
const RESULTS_DIR = 'evals/results';

const arg = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};
const RUNS = Number(arg('runs') || 3);
const ONLY = arg('only')
  ?.split(',')
  .map((id) => id.trim());

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type StreamEvent = { type: string } & Record<string, unknown>;
type RunResult = {
  pass: boolean;
  /** 1 unless a stream/HTTP error (e.g. a rate limit) forced a retry. */
  attempts: number;
  failures: string[];
  answer: string;
  toolCalls: Array<ToolCall & { input: unknown }>;
  latencyMs: number;
  streamError?: string;
};

// ---- talking to the app ---------------------------------------------------------------------

async function ask(question: string): Promise<Omit<RunResult, 'pass' | 'failures' | 'attempts'>> {
  const started = performance.now();
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ id: 'eval-1', role: 'user', parts: [{ type: 'text', text: question }] }],
    }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const raw = await response.text(); // reads the whole stream
  const latencyMs = Math.round(performance.now() - started);

  const events: StreamEvent[] = raw
    .split('\n')
    .filter((line) => line.startsWith('data: {'))
    .map((line) => JSON.parse(line.slice('data: '.length)) as StreamEvent);

  const inputs = new Map<string, { name: string; input: unknown }>();
  const toolCalls: RunResult['toolCalls'] = [];
  let answer = '';
  let streamError: string | undefined;
  for (const event of events) {
    if (event.type === 'text-delta') answer += String(event.delta ?? '');
    if (event.type === 'tool-input-available') {
      inputs.set(String(event.toolCallId), { name: String(event.toolName), input: event.input });
    }
    if (event.type === 'tool-output-available' || event.type === 'tool-output-error') {
      const call = inputs.get(String(event.toolCallId));
      if (call) toolCalls.push({ ...call, output: event.output ?? { error: event.errorText } });
    }
    if (event.type === 'error') streamError = String(event.errorText ?? 'stream error');
  }
  return { answer: answer.trim(), toolCalls, latencyMs, streamError };
}

/** Retries only when the stream itself failed (e.g. a provider rate limit), not wrong answers. */
async function runOnce(evalCase: EvalCase, expectation: Expectation): Promise<RunResult> {
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await ask(evalCase.question);
      if (result.streamError && attempt < MAX_ATTEMPTS) {
        await sleep(DELAY_MS * 4 * attempt);
        continue;
      }
      const graded = grade(result.answer, result.toolCalls, expectation, evalCase.expectTools);
      const failures = result.streamError
        ? [`stream error: ${result.streamError}`, ...graded.failures]
        : graded.failures;
      return { ...result, pass: failures.length === 0, failures, attempts: attempt };
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(DELAY_MS * 4 * attempt);
        continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      return {
        pass: false,
        failures: [message],
        answer: '',
        toolCalls: [],
        latencyMs: 0,
        attempts: attempt,
      };
    }
  }
}

// ---- checks before running ------------------------------------------------------------------

async function checkServer(expectedStats: unknown, expectedTitles: string[]) {
  let stats: unknown;
  let titles: string[];
  try {
    const [statsResponse, gamesResponse] = await Promise.all([
      fetch(`${BASE_URL}/api/games/stats`),
      fetch(`${BASE_URL}/api/games?sortBy=title`),
    ]);
    if (!statsResponse.ok || !gamesResponse.ok) {
      throw new Error(`HTTP ${statsResponse.status}/${gamesResponse.status} from ${BASE_URL}`);
    }
    stats = await statsResponse.json();
    titles = ((await gamesResponse.json()) as Array<{ title: string }>).map((g) => g.title);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('HTTP')) throw error;
    throw new Error(
      `No app at ${BASE_URL}. Start it with: npm run eval:db && DB_PATH=${EVAL_DB_PATH} npm run dev`,
    );
  }
  // The app has no evals endpoint (§7.3), so "is it on the eval DB?" is answered by comparing
  // its stats and its full title list with the eval DB's own.
  if (
    JSON.stringify(stats) !== JSON.stringify(expectedStats) ||
    JSON.stringify(titles) !== JSON.stringify(expectedTitles)
  ) {
    throw new Error(
      `The app at ${BASE_URL} is not using ${EVAL_DB_PATH} (its stats differ: ${JSON.stringify(stats)}). ` +
        `Restart it with DB_PATH=${EVAL_DB_PATH}, after npm run eval:db.`,
    );
  }
}

// ---- reporting ------------------------------------------------------------------------------

const pct = (value: number) => `${Math.round(value * 100)}%`;
const avg = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

function toMarkdown(summary: Record<string, string | number>, rows: Array<Record<string, string>>) {
  const header =
    '| Case | Category | Pass rate | Avg latency | Tools used |\n|---|---|---|---|---|';
  const lines = rows.map(
    (r) => `| ${r.case} | ${r.category} | ${r.passRate} | ${r.avgLatency} | ${r.tools} |`,
  );
  return [
    `**Model:** ${summary.model} · **Runs per case:** ${summary.runs} · **Date:** ${summary.date}`,
    '',
    `**Overall accuracy: ${summary.accuracy}** (${summary.passed}/${summary.total} runs) · avg latency ${summary.avgLatency} · avg tool calls ${summary.avgToolCalls}`,
    '',
    header,
    ...lines,
    '',
  ].join('\n');
}

// ---- main -----------------------------------------------------------------------------------

async function main() {
  const service = createGamesService(createGamesRepository(openDatabase(EVAL_DB_PATH)));
  if (!Number.isInteger(RUNS) || RUNS < 1) throw new Error(`--runs must be a whole number ≥ 1`);
  if (!Number.isFinite(THRESHOLD)) throw new Error(`EVAL_THRESHOLD must be a number`);
  const cases = ONLY ? CASES.filter((c) => ONLY.includes(c.id)) : CASES;
  if (cases.length === 0) throw new Error(`--only matched no case ids`);

  await checkServer(
    service.getStats(),
    service.listGames({ sortBy: 'title' }).map((g) => g.title),
  );
  console.log(`Running ${cases.length} cases × ${RUNS} runs against ${BASE_URL}\n`);

  const results: Array<{ evalCase: EvalCase; expectation: Expectation; runs: RunResult[] }> = [];
  for (const evalCase of cases) {
    const expectation = evalCase.expected(service);
    const runs: RunResult[] = [];
    for (let run = 0; run < RUNS; run++) {
      runs.push(await runOnce(evalCase, expectation));
      process.stdout.write(runs.at(-1)?.pass ? '.' : 'F');
      await sleep(DELAY_MS);
    }
    process.stdout.write(` ${evalCase.id}\n`);
    results.push({ evalCase, expectation, runs });
  }

  const allRuns = results.flatMap((r) => r.runs);
  const passed = allRuns.filter((r) => r.pass).length;
  const accuracy = passed / allRuns.length;

  const rows = results.map(({ evalCase, runs }) => ({
    case: evalCase.id,
    category: evalCase.category,
    passRate: `${runs.filter((r) => r.pass).length}/${runs.length}`,
    avgLatency: `${(avg(runs.map((r) => r.latencyMs)) / 1000).toFixed(1)}s`,
    tools: [...new Set(runs.flatMap((r) => r.toolCalls.map((c) => c.name)))].join(', ') || '–',
    retries: String(runs.reduce((n, r) => n + r.attempts - 1, 0)),
  }));
  const summary = {
    model: process.env.EVAL_MODEL_LABEL || `${chatProvider()} / ${chatModelId()}`,
    runs: RUNS,
    date: new Date().toLocaleDateString('en-CA'), // local YYYY-MM-DD
    accuracy: pct(accuracy),
    passed,
    total: allRuns.length,
    avgLatency: `${(avg(allRuns.map((r) => r.latencyMs)) / 1000).toFixed(1)}s`,
    avgToolCalls: avg(allRuns.map((r) => r.toolCalls.length)).toFixed(1),
  };

  console.log();
  console.table(rows);
  console.table([
    {
      accuracy: summary.accuracy,
      passed: `${passed}/${allRuns.length}`,
      avgLatency: summary.avgLatency,
      avgToolCalls: summary.avgToolCalls,
    },
  ]);

  const failed = results.filter((r) => r.runs.some((run) => !run.pass));
  for (const { evalCase, expectation, runs } of failed) {
    console.log(`\n✗ ${evalCase.id}: ${evalCase.question}`);
    console.log(`  expected: ${JSON.stringify(expectation)}`);
    runs.forEach((run, i) => {
      if (run.pass) return;
      console.log(`  run ${i + 1}: ${run.failures.join('; ')}`);
      console.log(`    answer: ${run.answer.slice(0, 300) || '(empty)'}`);
    });
  }

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    `${RESULTS_DIR}/latest.json`,
    JSON.stringify(
      {
        summary,
        cases: results.map(({ evalCase, expectation, runs }) => ({
          id: evalCase.id,
          category: evalCase.category,
          question: evalCase.question,
          expected: expectation,
          expectedTools: evalCase.expectTools,
          runs,
        })),
      },
      null,
      2,
    ),
  );
  writeFileSync(`${RESULTS_DIR}/latest.md`, toMarkdown(summary, rows));
  console.log(`\nWrote ${RESULTS_DIR}/latest.json and latest.md`);

  // `!(… >= …)` so a NaN accuracy can never count as passing.
  if (!(accuracy >= THRESHOLD)) {
    console.error(`\nAccuracy ${pct(accuracy)} is below the threshold ${pct(THRESHOLD)}.`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
