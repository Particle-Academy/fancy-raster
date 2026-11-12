/**
 * Spherical Web Mercator (EPSG:3857) in "world pixels": at zoom z the whole
 * world is a square of `tileSize * 2^z` pixels, origin at the north-west corner,
 * y growing south. This is the coordinate space every XYZ tile server uses.
 *
 * Pure functions, no allocation beyond the returned object.
 */

export interface LngLat {
  lng: number;
  lat: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

/** The latitude at which Web Mercator's square world ends: atan(sinh(pi)). */
export const MAX_LATITUDE = (Math.atan(Math.sinh(Math.PI)) * 180) / Math.PI;

export const DEFAULT_TILE_SIZE = 256;

const DEG = Math.PI / 180;

export function worldSize(zoom: number, tileSize: number = DEFAULT_TILE_SIZE): number {
  return tileSize * Math.pow(2, zoom);
}

export function clampLatitude(lat: number): number {
  return Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
}

/** Wrap a longitude into [-180, 180). */
export function wrapLongitude(lng: number): number {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped === 0 ? 0 : wrapped;
}

export function lngLatToWorld(p: LngLat, zoom: number, tileSize: number = DEFAULT_TILE_SIZE): Point {
  const size = worldSize(zoom, tileSize);
  const sin = Math.sin(clampLatitude(p.lat) * DEG);
  return {
    x: ((p.lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

export function worldToLngLat(p: Point, zoom: number, tileSize: number = DEFAULT_TILE_SIZE): LngLat {
  const size = worldSize(zoom, tileSize);
  const n = Math.PI * (1 - (2 * p.y) / size);
  return {
    lng: (p.x / size) * 360 - 180,
    lat: Math.atan(Math.sinh(n)) / DEG,
  };
}

/** The XYZ tile containing a coordinate, clamped into the pyramid at `zoom`. */
export function lngLatToTile(p: LngLat, zoom: number): TileCoord {
  if (!Number.isInteger(zoom) || zoom < 0) {
    throw new RangeError(`fancy-raster: tile zoom must be a non-negative integer, got ${zoom}`);
  }
  const { x, y } = lngLatToWorld(p, zoom, 1);
  const max = Math.pow(2, zoom) - 1;
  return {
    z: zoom,
    x: Math.max(0, Math.min(max, Math.floor(x))),
    y: Math.max(0, Math.min(max, Math.floor(y))),
  };
}
