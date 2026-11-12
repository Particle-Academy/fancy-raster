import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "tsup";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import config from "../tsup.config";
import { checkBudget, measure } from "../scripts/size.mjs";

/**
 * The size budgets from .ai/plans/fancy-raster-map-engine.md, section 2, as a
 * failing test. Owner-approved 2026-11-12: "speed and being lightweight are very
 * important".
 *
 * How it measures, so a number here can be compared with another:
 * - the package's OWN tsup config, ESM only, built fresh into a temp dir (CI runs
 *   Test before Build, so it cannot rely on dist/);
 * - UNMINIFIED, exactly as shipped. A consumer's bundler minifies, so the real
 *   cost is lower; a budget that holds unminified holds minified;
 * - Node's zlib gzip at its default level, summed per file over the entry's
 *   static-import closure (dynamic imports are lazy and are not counted);
 * - 1 KB = 1000 bytes, the stricter reading.
 *
 * A budget whose entries are not built yet is a TODO, never a pass. An entry the
 * build emits that no budget covers fails, so a new subpath cannot ship unweighed.
 * The fancy-map `/raster` adapter (1.5 KB) is budgeted in fancy-map's own suite.
 */
type Budget = { name: string; entries: string[]; beyond?: string[]; gzipMax: number };

const KB = 1000;
const BUDGETS: Budget[] = [
  { name: "default 2D map: core + canvas2d + overlay", entries: ["index", "canvas2d", "overlay"], gzipMax: 14 * KB },
  { name: "webgl renderer, lazy, beyond the default map", entries: ["webgl"], beyond: ["index", "canvas2d", "overlay"], gzipMax: 7 * KB },
  { name: "fancy-3d subpath, beyond core + webgl", entries: ["fancy-3d"], beyond: ["index", "webgl"], gzipMax: 3 * KB },
];

const configEntries = Object.keys((config as { entry: Record<string, string> }).entry);
const out = mkdtempSync(join(tmpdir(), "fancy-raster-budget-"));

beforeAll(async () => {
  await build({
    ...(config as object),
    config: false,
    outDir: out,
    format: ["esm"],
    dts: false,
    sourcemap: false,
    clean: true,
    silent: true,
  });
}, 60_000);

afterAll(() => rmSync(out, { recursive: true, force: true }));

const js = (entry: string) => `${entry}.js`;

describe("size budgets (gzip, unminified ESM)", () => {
  it("every built entry is covered by a budget", () => {
    const covered = new Set(BUDGETS.flatMap((b) => b.entries));
    const unbudgeted = configEntries.filter((e) => !covered.has(e));
    expect(unbudgeted).toEqual([]);
  });

  it("the build emitted every configured entry", () => {
    const files = readdirSync(out);
    for (const entry of configEntries) {
      expect(files).toContain(js(entry));
    }
  });

  for (const budget of BUDGETS) {
    const missing = [...budget.entries, ...(budget.beyond ?? [])].filter((e) => !configEntries.includes(e));
    if (missing.length > 0) {
      it.todo(`${budget.name} <= ${budget.gzipMax / KB} KB (not built yet: ${missing.join(", ")})`);
      continue;
    }
    it(`${budget.name} <= ${budget.gzipMax / KB} KB`, () => {
      const result = measure(out, budget.entries.map(js), (budget.beyond ?? []).map(js));
      const verdict = checkBudget(result, budget.gzipMax);
      expect(verdict.ok, verdict.message).toBe(true);
    });
  }

  // Phase 0 has only the core, so the default-map budget cannot run yet. The core
  // alone is still weighed against the whole 14 KB so it cannot spend the
  // renderers' share unnoticed before they exist.
  it("core alone stays inside the default-map budget", () => {
    const result = measure(out, [js("index")]);
    expect(result.gzip).toBeGreaterThan(0);
    const verdict = checkBudget(result, BUDGETS[0].gzipMax);
    expect(verdict.ok, verdict.message).toBe(true);
  });
});
