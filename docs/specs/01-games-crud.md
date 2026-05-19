# Specs for "Games CRUD"

**Branch:** `feature/games-crud`

---

## Summary

The catalog has no structured storage or management layer. This feature introduces a complete games data model with six fields—title, developer, genre, monthly_revenue_usd, monthly_downloads, and average_rating—backed by local persistence, so that game entries can be reliably created, read, updated, and deleted.

## Requirements

### Requirement 1 — Games CRUD

**User Story:** As a user, I can create, read, update, and delete games in the catalog.

**Acceptance Criteria:**
- [ ] AC-1.1: Games CRUD Fields: title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating.
- [ ] AC-1.2: Persist locally using SQLite.

---

## Out of Scope

*(none declared)*

## Possible Edge Cases

- EC-1: Non-numeric values submitted for monthly_revenue_usd, monthly_downloads, or average_rating — bad input breaks all numeric queries.
- EC-2: average_rating outside a defined range (e.g., > 5 or < 0) — "games rated above 4" assumes a bounded scale; source does not state the range.

## Open Questions

- OQ-1: What is the valid scale/range for average_rating (e.g., 0–5, 0–10)?
