# Specs for "REST API"

**Branch:** `feature/rest-api`

---

## Summary

With the game catalog stored locally, this feature exposes it over HTTP so that client applications—including the dashboard UI and the AI chat—can query and mutate game records without direct database access.

## Requirements

### Requirement 1 — REST API

**Acceptance Criteria:**
- [ ] AC-1.1: Expose the catalog via API routes.
- [ ] AC-1.2: GET /games
- [ ] AC-1.3: POST /games
- [ ] AC-1.4: PUT /games/:id
- [ ] AC-1.5: DELETE /games/:id
- [ ] AC-1.6: GET /games/:id

---

## Out of Scope

*(none declared)*

## Possible Edge Cases

*(none declared)*

## Open Questions

*(none)*
