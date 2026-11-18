# Changelog

Notable changes to `@particle-academy/fancy-raster`. Format:
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**BREAKING** marks anything that can stop working on upgrade. This package is
pre-1.0, so breaking changes land in MINOR releases -- read those entries before
upgrading.

---

## [Unreleased]

### Changed

- **CI: the lab-certificate gate verifies against the lab's rotated key list.**
  The lab's first signing key is retired: certificates it already issued still
  verify, and nothing new it signs ever can. Consumers do nothing.

- **Releases need a lab-run certificate.** `publish.yml` gains a read-only
  `lab-certificate` job that every publishing job needs: a tag is published only
  when the fancy-labs lab has certified that exact version and commit. Consumers
  do nothing; this changes how releases are cut, not what the package does.
- Rebranded the display name to Fancy Dev Kit (README and package description). Package names, the npm scope, URLs and the `fancy-ui` MCP id are unchanged.
- **Docs:** `AGENTS.md` is now the guide to using this package (install, how to find it on the Fancy MCP catalog server once it is listed, API essentials, traps), and it ships in the package. The contributor notes it held moved to `CONTRIBUTING.md`, and `CLAUDE.md` is now a symlink to it. The README points to the MCP server and to `AGENTS.md`. No code changed; nothing to do.

## [0.0.0]

Name claim and Phase 0 of the design in the fancy.agi envelope,
`.ai/plans/fancy-raster-map-engine.md`. Not a usable map engine yet: there is no
renderer. Nothing to do; nothing depends on this version.

### Added

- Web Mercator math in the core: `lngLatToWorld`, `worldToLngLat`, `lngLatToTile`,
  `worldSize`, `wrapLongitude`, `clampLatitude`, `MAX_LATITUDE`. Round-trips to
  within 0.5 px at zooms 0-19.
- Size budgets as a failing test (`test/size-budget.test.ts`): the default 2D map
  (core + canvas2d + overlay) <= 14 KB gzip, the lazy WebGL renderer <= 7 KB, the
  fancy-3d subpath <= 3 KB. Measured with Node's zlib on the unminified ESM the
  package ships; subpaths that do not exist yet are reported as TODO, never as a
  pass, and a built entry with no budget fails. The core is 0.6 KB.
- `bench/leaflet-baseline.mjs` and its result `bench/leaflet-baseline.json`:
  Leaflet 1.9.4's frame intervals on the lab's tile fixture, the bar fancy-raster
  is measured against. Not published.
- Zero runtime dependencies, enforced by `test/packaging.test.ts`.
