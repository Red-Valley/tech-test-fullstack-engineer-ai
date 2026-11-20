// Deterministic grading, no LLM judge (ARCHITECTURE.md §7.3). A case passes only if the answer
// contains every expected value, none of the forbidden ones, and the expected tools ran.

/** A value the answer must (or must not) contain. Numbers match numerically, strings as text. */
export type Expected = string | number;

export type Expectation = {
  /** Every one of these must appear. */
  includes: Expected[];
  /** For each group, at least one entry must appear (e.g. ways of saying "not found"). */
  includesAny?: Expected[][];
  /** None of these may appear (e.g. the runner-up named as the winner). */
  excludes?: Expected[];
};

/**
 * Tools the answer must have used. Each entry is a tool name, or a list of acceptable
 * alternatives (e.g. counting can be done with aggregate_games or query_games' total).
 * An empty list means "must not call any tool" (out-of-scope questions).
 */
export type ExpectedTools = Array<string | string[]>;

export type ToolCall = { name: string; output: unknown };

export type GradeResult = { pass: boolean; failures: string[] };

const WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

const SUFFIX: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/** Lowercase, unify quotes/dashes/spaces, so text matching ignores typography. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/[  \s]+/g, ' ')
    .trim();
}

/**
 * Every number written in the text, as a value: "$1,665,000" → 1665000, "$1.7M" → 1700000,
 * "412K" → 412000, "3.8" → 3.8, "nine" → 9. Ratios like "2×" → 2.
 */
export function extractNumbers(text: string): number[] {
  const normalized = normalizeText(text);
  const numbers: number[] = [];
  const pattern = /(?<![\w.])\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s*(k|m|b)?(?![a-z])/g;
  for (const match of normalized.matchAll(pattern)) {
    const [, whole, decimals, suffix] = match;
    let value = Number(`${whole.replace(/,/g, '')}${decimals ? `.${decimals}` : ''}`);
    if (suffix) value *= SUFFIX[suffix];
    numbers.push(value);
  }
  for (const word of normalized.match(/\b[a-z]+\b/g) ?? []) {
    if (word in WORD_NUMBERS) numbers.push(WORD_NUMBERS[word]);
  }
  return numbers;
}

/**
 * Does the answer contain this value? A number matches if any number in the answer is equal
 * after rounding to the precision the model could reasonably use: exact for integers below
 * 1,000 (counts), within 0.05 for decimals (ratings, ratios), and within 1% for larger amounts
 * (so "$1.7M" counts for 1,665,000 but "$1.5M" doesn't).
 */
export function contains(answer: string, expected: Expected): boolean {
  if (typeof expected === 'string') return normalizeText(answer).includes(normalizeText(expected));
  return extractNumbers(answer).some((value) => numbersMatch(value, expected));
}

export function numbersMatch(actual: number, expected: number): boolean {
  if (!Number.isInteger(expected)) return Math.abs(actual - expected) <= 0.05 + 1e-9;
  if (Math.abs(expected) < 1000) return actual === expected;
  return Math.abs(actual - expected) <= Math.abs(expected) * 0.01;
}

/** How many games a tool output carries (games arrays and single game objects). */
export function countGames(output: unknown): number {
  if (typeof output !== 'object' || output === null) return 0;
  const record = output as Record<string, unknown>;
  const list = Array.isArray(record.games) ? record.games.length : 0;
  const single = typeof record.game === 'object' && record.game !== null ? 1 : 0;
  return list + single;
}

const describe = (value: Expected) => (typeof value === 'number' ? String(value) : `"${value}"`);

export function grade(
  answer: string,
  toolCalls: ToolCall[],
  expectation: Expectation,
  expectedTools: ExpectedTools,
): GradeResult {
  const failures: string[] = [];

  for (const value of expectation.includes) {
    if (!contains(answer, value)) failures.push(`missing ${describe(value)}`);
  }
  for (const group of expectation.includesAny ?? []) {
    if (!group.some((value) => contains(answer, value))) {
      failures.push(`missing one of ${group.map(describe).join(' / ')}`);
    }
  }
  for (const value of expectation.excludes ?? []) {
    if (contains(answer, value)) failures.push(`should not mention ${describe(value)}`);
  }

  const called = new Set(toolCalls.map((call) => call.name));
  if (expectedTools.length === 0 && called.size > 0) {
    failures.push(`expected no tool calls, got ${[...called].join(', ')}`);
  }
  for (const tool of expectedTools) {
    const options = Array.isArray(tool) ? tool : [tool];
    if (!options.some((name) => called.has(name))) {
      failures.push(`expected tool ${options.join(' or ')}`);
    }
  }
  for (const call of toolCalls) {
    const games = countGames(call.output);
    if (games > 10) failures.push(`${call.name} returned ${games} games (max 10)`);
  }

  return { pass: failures.length === 0, failures };
}
