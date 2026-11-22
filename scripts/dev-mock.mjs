// Starts the offline mock of the Anthropic API and the Next.js dev server together, with the app pointed at the
// mock. No API calls are made and no credits are spent, even if a real key is set in `.env` or `.env.local`:
// Next.js reads `process.env` before any `.env*` file, so the values set here win.
//
//   npm run dev:mock                 dev server on the default port
//   npm run dev:mock -- -p 3200      extra arguments go to `next dev`
//   MOCK_PORT=4011 npm run dev:mock  use another port for the mock

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { startMockAnthropic } from "./mock-anthropic.mjs";

const port = Number(process.env.MOCK_PORT ?? 4010);

let mock;
try {
  mock = await startMockAnthropic({ port });
} catch (err) {
  console.error(err && err.code === "EADDRINUSE" ? `Port ${port} is in use. Set MOCK_PORT to another port.` : err);
  process.exit(1);
}

console.log(`\nChat is using the offline mock model at ${mock.url}. No API calls are made.`);
console.log("It answers the three sample questions on the chat page. Anything else gets a short notice.\n");

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, ANTHROPIC_API_KEY: "mock-key", ANTHROPIC_BASE_URL: mock.url },
});

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", async (code, signal) => {
  await mock.close();
  process.exit(code ?? (signal ? 1 : 0));
});
