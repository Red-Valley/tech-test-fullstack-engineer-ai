# Contract: Catalog URL State

**Route**: `/` | **Parser**: `src/lib/games/catalog-view.ts` (`parseCatalogView`,
`serializeCatalogView`)

```
/?q=<text>&genre=<genre>&sort=<title|revenue|downloads|rating>&dir=<asc|desc>
```

| Param | Meaning | Default (omitted from URL) |
|---|---|---|
| `q` | Title or developer contains (case-insensitive) | empty |
| `genre` | Exact genre (case-insensitive) | all genres |
| `sort` | Sort column | `revenue` |
| `dir` | Direction | `desc` for numeric columns, `asc` for `title` |

**Rules**

- Unknown `sort` → `revenue`. Unknown `dir` → the default for the resolved `sort`.
- `q` longer than 100 chars is truncated. Repeated params use the first value.
- Serialization drops default values and orders keys `q, genre, sort, dir`, so equal views
  give equal URLs.
- Header click: same column → flip `dir`; new column → that column's default `dir`.
- Clear filters → removes `q` and `genre`, keeps `sort` and `dir`.

**Examples**

| URL | View |
|---|---|
| `/` | all games, revenue ↓ |
| `/?q=lantern` | 2 games (Moth & Lantern, Cinder & Salt) |
| `/?genre=racing` | Neon Drift |
| `/?sort=rating` | rating ↓ (Cinder & Salt first) |
| `/?sort=title&dir=desc` | title Z→A |
| `/?sort=bogus&dir=up` | treated as `/` |
