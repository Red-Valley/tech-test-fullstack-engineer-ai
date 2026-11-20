**Model:** groq / openai/gpt-oss-120b · **Runs per case:** 3 · **Date:** 2026-11-19

**Overall accuracy: 95%** (57/60 runs) · avg latency 3.0s · avg tool calls 1.0

| Case | Category | Pass rate | Avg latency | Tools used |
|---|---|---|---|---|
| top-revenue | ranking | 3/3 | 1.2s | query_games |
| top3-downloads | ranking | 3/3 | 1.1s | query_games |
| lowest-rated | ranking | 3/3 | 1.4s | query_games, aggregate_games |
| count-above-4 | counting | 3/3 | 0.9s | aggregate_games |
| count-roguelikes | counting | 3/3 | 6.1s | aggregate_games |
| avg-rating-roguelike | aggregates | 3/3 | 2.8s | aggregate_games |
| total-revenue | aggregates | 3/3 | 1.9s | aggregate_games |
| total-downloads | aggregates | 3/3 | 2.8s | aggregate_games |
| compare-revenue | comparison | 3/3 | 3.3s | compare_games |
| compare-downloads | comparison | 3/3 | 3.3s | compare_games |
| fuzzy-compare | fuzzy | 0/3 | 6.2s | compare_games |
| fuzzy-rating | fuzzy | 3/3 | 2.8s | find_game |
| partial-title | fuzzy | 3/3 | 3.1s | find_game |
| not-found | not-found | 3/3 | 3.2s | find_game |
| not-found-revenue | not-found | 3/3 | 3.1s | find_game |
| empty-horror | empty | 3/3 | 4.0s | query_games |
| genre-highest-avg-revenue | multi-step | 3/3 | 3.5s | aggregate_games |
| genre-highest-total-revenue | multi-step | 3/3 | 4.1s | aggregate_games |
| out-of-scope-weather | out-of-scope | 3/3 | 1.2s | – |
| injection-rating | injection | 3/3 | 3.2s | find_game |
