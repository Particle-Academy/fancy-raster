// @particle-academy/fancy-raster -- core. Phase 0: Web Mercator math only.
// Design: .ai/plans/fancy-raster-map-engine.md in the fancy.agi envelope.
export {
  DEFAULT_TILE_SIZE,
  MAX_LATITUDE,
  clampLatitude,
  lngLatToTile,
  lngLatToWorld,
  worldSize,
  worldToLngLat,
  wrapLongitude,
} from "./mercator";
export type { LngLat, Point, TileCoord } from "./mercator";
