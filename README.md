---

## Submission

### Time Spent

~ approximately 3 hours total, distributed as follows:

- Project setup and CRUD implementation: ~45 min
- REST API and storage layer: ~30 min
- AI chat integration (tool calling + streaming): ~60 min
- UI layout and component refactor: ~30 min
- Debugging SDK version mismatches: ~15 min

---

### How to Run Locally

**Prerequisites:** Node.js 18+ and an [OpenRouter](https://openrouter.ai/keys) API key.

1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd <repo-folder>
   npm install
   ```

2. Create a `.env.local` file at the root with your API key:
   ```bash
   OPENROUTER_API_KEY=sk-or-your-key-here
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

> The catalog is persisted in `data/games.json`. The file is created automatically if it doesn't exist.

---

### Trade-offs Made

- **Storage — JSON file over SQLite:** Chose a flat JSON file for simplicity and zero configuration. The trade-off is that concurrent writes could cause race conditions at scale, but for a local single-user dashboard this is not a concern.

- **Single tool (`get_game_catalog`) over multiple specialized tools:** A single tool that returns the full catalog keeps the implementation simple and lets the LLM handle all filtering and ranking logic. The trade-off is a larger tool response payload. For a larger catalog, specialized tools (e.g. `get_top_games_by_revenue`, `filter_games_by_rating`) would be preferable.

- **OpenRouter free model (`nex-agi/nex-n2-pro:free`):** Used a free-tier model to avoid incurring costs during the assessment. The trade-off is occasional latency and less reliable tool-calling behavior compared to a paid model like GPT-4o or Claude 3.5 Sonnet.

- **Game title is not editable:** Once a game is created, its title cannot be modified.
  This is an intentional design decision — the title acts as the primary human-readable
  identifier of a game. Allowing it to change would break references in chat history
  (e.g. "Compare revenue of Game A vs Game B") where the user referred to the game by
  its original name. The edit form enforces this by disabling the title field.

  - **Architecture — Monolithic Page State:** The state management and API handler functions (`handleCreate`, `handleEdit`, etc.) are currently colocated within the main `page.tsx`. While fully operational, a more scalable production approach would involve extracting this logic into a custom React hook or encapsulating form states and HTTP requests directly inside the `CreateGameModal` and `EditGameModal` components. This would better decouple UI layout from business logic, but it was left as-is due to the 3-hour time constraint.
