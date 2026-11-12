#!/usr/bin/env node
// leaflet-baseline.mjs -- Phase 0 bar: how Leaflet performs on the lab's fixture,
// so fancy-raster's frame numbers have something real to be compared with.
//
//   node bench/leaflet-baseline.mjs \
//     --leaflet <dir holding leaflet.js + leaflet.css> \
//     --playwright <path to playwright/index.mjs> \
//     --tile <fixture tile.png> [--runs 3] [--out bench/leaflet-baseline.json]
//
// Node built-ins only; nothing here is a dependency of the package and nothing is
// published (bench/ is not in `files`). Leaflet is read from wherever it is
// already installed, never downloaded. The browser is whatever Playwright build
// is installed (in this estate: the prism-browser sidecar's Playwright 1.62.1
// and its one build, chromium_headless_shell-1234), headless.
//
// What it measures, at 1280x800 and DPR 2, after the first tiles have loaded:
//   drag  -- a 600 px pan over 60 pointer moves (~1 s), then 1.5 s of inertia;
//   wheel -- 8 wheel-ins then 8 wheel-outs at the cursor, 150 ms apart.
// For each: requestAnimationFrame interval p50/p95/p99/max, long tasks (> 50 ms)
// from a PerformanceObserver, and tile requests seen by the server.
//
// Headless shell renders in software. These are regression baselines on this
// machine, never claims about a device. Leaflet exposes no per-frame engine time,
// so "engine work" is not measured for it; fancy-raster reports its own via stats().
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { cpus, platform, release } from "node:os";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, []),
);
for (const required of ["leaflet", "playwright", "tile"]) {
  if (!args[required]) {
    console.error(`missing --${required}`);
    process.exit(2);
  }
}
const runs = Number(args.runs ?? 3);
const leafletJs = readFileSync(join(args.leaflet, "leaflet.js"), "utf8");
const leafletCss = readFileSync(join(args.leaflet, "leaflet.css"), "utf8");
const leafletVersion = (leafletJs.match(/Leaflet ([0-9.]+)/) ?? [])[1] ?? "unknown";
const tile = readFileSync(args.tile);

const page = `<!doctype html><html><head><meta charset="utf-8"><title>leaflet baseline</title>
<style>${leafletCss} html,body,#map{margin:0;width:100%;height:100%}</style></head>
<body><div id="map"></div><script>${leafletJs}</script><script>
window.__probe = { frames: [], longTasks: [], recording: false };
const probe = window.__probe;
(function tick(t) { if (probe.recording) probe.frames.push(t); requestAnimationFrame(tick); })(performance.now());
new PerformanceObserver((list) => { for (const e of list.getEntries()) if (probe.recording) probe.longTasks.push(e.duration); })
  .observe({ type: "longtask", buffered: false });
const map = L.map("map").setView([51.5072, -0.1276], 10);
const layer = L.tileLayer("/tiles/{z}/{x}/{y}.png", { attribution: "Local test tiles" }).addTo(map);
window.__tilesLoaded = new Promise((resolve) => layer.once("load", resolve));
</script></body></html>`;

let tileRequests = 0;
const server = createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(page);
  } else if (/^\/tiles\/\d+\/\d+\/\d+\.png$/.test(req.url ?? "")) {
    tileRequests++;
    res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "max-age=3600" });
    res.end(tile);
  } else {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const { chromium } = await import(pathToFileURL(args.playwright).href);
const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
function summarise(frames, longTasks, requests) {
  const intervals = frames.slice(1).map((t, i) => t - frames[i]).sort((a, b) => a - b);
  const r = (n) => Math.round(n * 100) / 100;
  return {
    frames: frames.length,
    intervalMs: intervals.length
      ? { p50: r(pct(intervals, 50)), p95: r(pct(intervals, 95)), p99: r(pct(intervals, 99)), max: r(intervals[intervals.length - 1]) }
      : null,
    longTasks: longTasks.length,
    longTaskMaxMs: longTasks.length ? r(Math.max(...longTasks)) : 0,
    tileRequests: requests,
  };
}

async function phase(tab, name, act) {
  await tab.evaluate(() => { window.__probe.frames = []; window.__probe.longTasks = []; window.__probe.recording = true; });
  const before = tileRequests;
  await act();
  const data = await tab.evaluate(() => { window.__probe.recording = false; return { frames: window.__probe.frames, longTasks: window.__probe.longTasks }; });
  return [name, summarise(data.frames, data.longTasks, tileRequests - before)];
}

const results = [];
for (let run = 1; run <= runs; run++) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const tab = await context.newPage();
  tileRequests = 0;
  const t0 = Date.now();
  await tab.goto(origin + "/");
  await tab.evaluate(() => window.__tilesLoaded);
  const firstLoadMs = Date.now() - t0;
  const initialTiles = tileRequests;
  await tab.waitForTimeout(500);

  const drag = await phase(tab, "drag", async () => {
    await tab.mouse.move(940, 400);
    await tab.mouse.down();
    for (let i = 1; i <= 60; i++) {
      await tab.mouse.move(940 - i * 10, 400 + Math.round(Math.sin(i / 10) * 40));
      await tab.waitForTimeout(16);
    }
    await tab.mouse.up();
    await tab.waitForTimeout(1500);
  });

  const wheel = await phase(tab, "wheel", async () => {
    await tab.mouse.move(640, 400);
    for (const dy of [...Array(8).fill(-100), ...Array(8).fill(100)]) {
      await tab.mouse.wheel(0, dy);
      await tab.waitForTimeout(150);
    }
    await tab.waitForTimeout(1000);
  });

  results.push({ run, firstLoadMs, initialTiles, phases: Object.fromEntries([drag, wheel]) });
  await context.close();
}

await browser.close();
server.close();

const report = {
  measured: new Date().toISOString(),
  subject: `Leaflet ${leafletVersion}`,
  browser: `playwright chromium ${browserVersion} (headless)`,
  machine: { platform: platform(), release: release(), cpu: cpus()[0]?.model ?? "unknown", cores: cpus().length },
  viewport: "1280x800 @ DPR 2",
  fixture: "one static 256 px PNG served for every /tiles/{z}/{x}/{y}.png (the flabs kit-site fixture)",
  caveat: "Software-rendered headless shell: a regression baseline on this machine, not a device claim. Leaflet exposes no engine time.",
  runs: results,
};
const text = JSON.stringify(report, null, 2) + "\n";
if (args.out) writeFileSync(args.out, text);
process.stdout.write(text);
