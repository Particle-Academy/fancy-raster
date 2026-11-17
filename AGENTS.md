# Using @particle-academy/fancy-raster — guide for agents

How an agent installs and uses this package in a consumer app. What the package
is, is in [README.md](./README.md). Notes for working ON this repo's code are in
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Status first

**0.0.x, Phase 0: only the Web Mercator math exists.** There is no renderer, so
this is not a usable map. Do not depend on it in a consumer app; for a map today
use `@particle-academy/fancy-map`.

## Install

Not on npm yet. Once it is published:

```bash
npm install @particle-academy/fancy-raster
```

- **Node:** `>=22`. Zero runtime dependencies and no React.

## Find it on the Fancy MCP server

The catalog server is `https://ui.particle.academy/mcp` (streamable HTTP, no API
key; MCP id `fancy-ui`). This package is not listed there yet; it appears once
released. Look for it later with `search-components`.

## API essentials

The core entry exports the Mercator math:

```ts
import { lngLatToWorld, worldToLngLat, lngLatToTile } from "@particle-academy/fancy-raster";

lngLatToTile({ lng: -0.1276, lat: 51.5072 }, 10); // { z: 10, x: 511, y: 340 }
lngLatToWorld({ lng: 0, lat: 0 }, 0);              // { x: 128, y: 128 }
```

World pixels are `tileSize * 2^zoom`, origin north-west, y growing south.

## Traps

- **`lngLatToTile` refuses a fractional zoom** and clamps into the tile pyramid.
- The planned subpaths (`/canvas2d`, `/webgl`, `/overlay`, `/fancy-3d`) do not
  exist yet.
