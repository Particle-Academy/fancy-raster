# @particle-academy/fancy-raster

[![Fancified](art/fancified.svg)](https://particle.academy)

A **tiled raster graphics engine** with **zero runtime dependencies** and no
React: Web Mercator math, a camera, a tile pyramid, a prioritised tile cache and
a 2D to 3D renderer path. It will become the default engine behind
[`fancy-map`](https://github.com/Particle-Academy/fancy-map)'s `<Map>`, and it
plugs into [`fancy-3d`](https://github.com/Particle-Academy/fancy-3d) scenes.

> **Status: 0.0.x, Phase 0.** Only the Web Mercator math exists today. There is
> no renderer yet, so this is not a usable map. Do not depend on it.

## Why

Speed and weight. The default 2D map (core + Canvas2D renderer + markers and
popups) has a hard budget of **14 KB gzip**, enforced by a failing test, and the
WebGL renderer for tilt and globe is a lazy **7 KB** on top. For comparison,
Leaflet 1.9.4 measures 42.7 KB gzip of minified JavaScript plus 3.5 KB of CSS
(Node zlib, default level).

## Planned layout

| Import | What |
|---|---|
| `@particle-academy/fancy-raster` | core: Mercator math, camera, tile pyramid, scheduler, cache, gestures, frame model |
| `/canvas2d` | Canvas2D renderer: 2D + bearing, the default and the smallest |
| `/webgl` | own WebGL renderer: pitch, bearing, globe |
| `/overlay` | DOM markers, popups, attribution, controls |
| `/fancy-3d` | `rasterEngine` (a fancy-3d `CanvasEngine`) + a `TileSource` |

Only the core exists in 0.0.x.

## Use (core)

```ts
import { lngLatToWorld, worldToLngLat, lngLatToTile } from "@particle-academy/fancy-raster";

lngLatToTile({ lng: -0.1276, lat: 51.5072 }, 10); // { z: 10, x: 511, y: 340 }
lngLatToWorld({ lng: 0, lat: 0 }, 0);              // { x: 128, y: 128 }
```

## Size

`npm test` builds the package and weighs it. Read the rules at the top of
`test/size-budget.test.ts`. To weigh anything else the same way:

```bash
node scripts/size.mjs path/to/file.js
```

## License

MIT
