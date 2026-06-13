# কোন ফোন? — frontend

React + Vite + TypeScript frontend for the KPK BD phone recommender. Ports the
`KonFonBD.dc.html` design mockup verbatim (liquid-glass, Bangla-first, ambient
orbs, accent palettes) into a real app wired to the FastAPI backend.

## Screens

- **Ask** — budget slider, Bangla NL search (`traits`), archetype chips, channel
  segment, advanced filters (platform / software style / China-ROM / exclude
  brands / current phone). → `GET /recommend`
- **Results** — top picks with reasoning, budget-fit bars, channel badges,
  savings, caveats, and a "stretch" pick. → `GET /recommend`
- **Detail** — scores + per-axis reasons, specs, owner voices, price history,
  where-to-buy offers, brand & ownership, who-it's-for. → `GET /phones/{id}`
- **Browse** — search/filter the full catalogue. → `GET /phones`

## Run

The backend must be running first:

```sh
cd ../../KPK/scraper && uvicorn api:app --port 8000
```

Then the frontend:

```sh
npm install
npm run dev          # http://localhost:5173
```

In dev, requests to `/api/*` are proxied to the API (see vite.config.ts).
Point the proxy elsewhere with `VITE_API_TARGET`, e.g.
`VITE_API_TARGET=http://192.168.0.5:8000 npm run dev`.

## Build

```sh
npm run build        # → dist/  (static, deploy anywhere)
npm run preview
```

For production set `VITE_API_BASE` to the absolute API origin (the dev `/api`
proxy doesn't exist in a static build), e.g.
`VITE_API_BASE=https://api.example.com npm run build`.

## Notes

- `src/theme.ts` holds the accent palettes, the `st()` raw-CSS→React-style
  helper (lets the mockup's inline styles be pasted near-verbatim), currency
  formatting, and the label/verdict/fit maps from the original DC logic.
- Node 18+ is recommended; Vite 4 is pinned so it still runs on Node 16.
