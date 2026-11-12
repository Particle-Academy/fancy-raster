import { describe, expect, it } from "vitest";
import {
  MAX_LATITUDE,
  clampLatitude,
  lngLatToTile,
  lngLatToWorld,
  wrapLongitude,
  worldSize,
  worldToLngLat,
} from "../src/index";

describe("worldSize", () => {
  it("is tileSize * 2^zoom, fractional zooms included", () => {
    expect(worldSize(0)).toBe(256);
    expect(worldSize(3)).toBe(2048);
    expect(worldSize(0, 512)).toBe(512);
    expect(worldSize(1.5)).toBeCloseTo(256 * Math.pow(2, 1.5), 9);
  });
});

describe("lngLatToWorld", () => {
  it("puts (0, 0) at the centre of the world", () => {
    expect(lngLatToWorld({ lng: 0, lat: 0 }, 0)).toEqual({ x: 128, y: 128 });
    expect(lngLatToWorld({ lng: 0, lat: 0 }, 2)).toEqual({ x: 512, y: 512 });
  });

  it("maps the antimeridian to the world edges", () => {
    expect(lngLatToWorld({ lng: -180, lat: 0 }, 0).x).toBe(0);
    expect(lngLatToWorld({ lng: 180, lat: 0 }, 0).x).toBe(256);
  });

  it("maps +/-MAX_LATITUDE to the top and bottom edges", () => {
    expect(lngLatToWorld({ lng: 0, lat: MAX_LATITUDE }, 0).y).toBeCloseTo(0, 6);
    expect(lngLatToWorld({ lng: 0, lat: -MAX_LATITUDE }, 0).y).toBeCloseTo(256, 6);
  });

  it("clamps latitudes beyond the Mercator limit instead of returning Infinity", () => {
    const top = lngLatToWorld({ lng: 0, lat: 90 }, 0);
    const bottom = lngLatToWorld({ lng: 0, lat: -90 }, 0);
    expect(Number.isFinite(top.y)).toBe(true);
    expect(top.y).toBeCloseTo(0, 6);
    expect(bottom.y).toBeCloseTo(256, 6);
  });
});

describe("worldToLngLat", () => {
  const points = [
    { lng: 0, lat: 0 },
    { lng: -0.1276, lat: 51.5072 }, // London
    { lng: 151.2093, lat: -33.8688 }, // Sydney
    { lng: -179.999, lat: 84.9 },
    { lng: 179.999, lat: -84.9 },
  ];

  it("inverts lngLatToWorld to within 0.5 px at every zoom 0-19", () => {
    for (let z = 0; z <= 19; z++) {
      for (const p of points) {
        const px = lngLatToWorld(p, z);
        const back = lngLatToWorld(worldToLngLat(px, z), z);
        expect(Math.abs(back.x - px.x)).toBeLessThan(0.5);
        expect(Math.abs(back.y - px.y)).toBeLessThan(0.5);
      }
    }
  });

  it("returns the original coordinate to 1e-9 degrees", () => {
    for (const p of points) {
      const back = worldToLngLat(lngLatToWorld(p, 12), 12);
      expect(back.lng).toBeCloseTo(p.lng, 9);
      expect(back.lat).toBeCloseTo(p.lat, 9);
    }
  });
});

describe("lngLatToTile", () => {
  it("matches the OSM slippy-map tile for named landmarks", () => {
    // Values from the OSM wiki formula (Slippy map tilenames), worked by hand.
    expect(lngLatToTile({ lng: -0.1276, lat: 51.5072 }, 10)).toEqual({ z: 10, x: 511, y: 340 });
    expect(lngLatToTile({ lng: 0, lat: 0 }, 0)).toEqual({ z: 0, x: 0, y: 0 });
    expect(lngLatToTile({ lng: 0.0001, lat: -0.0001 }, 1)).toEqual({ z: 1, x: 1, y: 1 });
    expect(lngLatToTile({ lng: -0.0001, lat: 0.0001 }, 1)).toEqual({ z: 1, x: 0, y: 0 });
  });

  it("keeps the antimeridian and the poles inside the pyramid", () => {
    expect(lngLatToTile({ lng: 180, lat: 0 }, 3).x).toBe(7);
    expect(lngLatToTile({ lng: -180, lat: 0 }, 3).x).toBe(0);
    expect(lngLatToTile({ lng: 0, lat: 90 }, 3).y).toBe(0);
    expect(lngLatToTile({ lng: 0, lat: -90 }, 3).y).toBe(7);
  });

  it("refuses a non-integer zoom", () => {
    expect(() => lngLatToTile({ lng: 0, lat: 0 }, 1.5)).toThrow(RangeError);
  });
});

describe("wrapLongitude", () => {
  it("wraps into [-180, 180)", () => {
    expect(wrapLongitude(190)).toBe(-170);
    expect(wrapLongitude(-190)).toBe(170);
    expect(wrapLongitude(540)).toBe(-180);
    expect(wrapLongitude(180)).toBe(-180);
    expect(wrapLongitude(-180)).toBe(-180);
    expect(wrapLongitude(12.5)).toBe(12.5);
  });
});

describe("clampLatitude", () => {
  it("clamps to +/-MAX_LATITUDE", () => {
    expect(MAX_LATITUDE).toBeCloseTo(85.0511287798, 9);
    expect(clampLatitude(89)).toBe(MAX_LATITUDE);
    expect(clampLatitude(-89)).toBe(-MAX_LATITUDE);
    expect(clampLatitude(45)).toBe(45);
  });
});
