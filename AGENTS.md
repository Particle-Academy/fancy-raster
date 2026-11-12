# fancy-raster code map

Tiled raster graphics engine. Pure TypeScript, **zero runtime dependencies, no React**. Design:
`.ai/plans/fancy-raster-map-engine.md` in the fancy.agi envelope (process rules live there too,
in `RULES.md`; this file only describes this repo's code).

## Where things are

- `src/index.ts`: the core barrel. Phase 0 exports only the Mercator math.
- `src/mercator.ts`: spherical Web Mercator in world pixels (`tileSize * 2^zoom`, origin
  north-west, y south). `lngLatToTile` clamps into the pyramid and refuses a fractional zoom.
- `scripts/size.mjs`: the one way this repo weighs JavaScript (zlib default level, per-file gzip
  summed over the static-import closure; dynamic imports are lazy and not counted). Also a CLI.
- `test/size-budget.test.ts`: the budgets. Builds with the package's own `tsup.config.ts` into a
  temp dir, ESM, unminified.
- `bench/leaflet-baseline.mjs` + `.json`: the Phase 0 Leaflet frame baseline. Not published.

## Invariants a change must keep

- **No entry in `dependencies` or `peerDependencies`.** `test/packaging.test.ts` checks.
- **Every tsup entry is in a budget.** Adding a subpath means adding it to `tsup.config.ts`,
  `package.json` `exports`, and a `BUDGETS` row, or `size-budget.test.ts` fails.
- **Budgets are measured unminified.** Do not switch on `minify` to make a budget pass: it would
  change what is measured, not what is shipped to a consumer's bundler.
- **A budget whose entries do not exist is `it.todo`, never a pass.**
- The core must stay renderer-free: renderers consume a plain-data frame and never decide which
  tiles to fetch (plan section 3).
