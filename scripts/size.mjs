#!/usr/bin/env node
// size.mjs -- the one way this repo weighs JavaScript. Node built-ins only.
//
// Used by test/size-budget.test.ts for the package's own chunks, and from the
// command line for anything else (Leaflet, for the Phase 0 comparison), so both
// numbers come from the same function and can be compared:
//
//   node scripts/size.mjs <file> [<file> ...]   raw + gzip bytes per file, and the total
//
// gzip is Node's zlib at its default level. Closures follow STATIC relative
// imports and re-exports only: a dynamic import() is a lazy chunk and is not
// paid for up front.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

export function gzipBytes(buffer) {
  return gzipSync(buffer).length;
}

// `import x from "./a.js"`, `import "./a.js"`, `export { x } from "./a.js"`,
// `export * from "./a.js"`, minified or not. Not `import("./a.js")`: the
// specifier must follow the keyword or `from`, and `(` is neither.
const STATIC_SPECIFIER = /(?:^|[;\s}])(?:import|export)\s*(?:[^'"();]*?[\s}*]from\s*)?(['"])(\.{1,2}\/[^'"]+)\1/g;

export function esmClosure(dir, entry) {
  const seen = new Set();
  const visit = (file) => {
    const key = normalize(file).split("\\").join("/");
    if (seen.has(key)) return;
    const path = join(dir, key);
    if (!existsSync(path)) throw new Error(`size.mjs: ${key} does not exist in ${dir}`);
    seen.add(key);
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(STATIC_SPECIFIER)) {
      const target = relative(dir, resolve(dirname(path), match[2]));
      visit(target);
    }
  };
  visit(entry);
  return [...seen];
}

// Sum of per-file gzip over every entry's closure, minus files already loaded by
// the `beyond` entries (how a lazy chunk is weighed: what it adds, not what it
// shares with what is already on the page).
export function measure(dir, entries, beyond = []) {
  const loaded = new Set(beyond.flatMap((e) => esmClosure(dir, e)));
  const files = [...new Set(entries.flatMap((e) => esmClosure(dir, e)))].filter((f) => !loaded.has(f));
  let raw = 0;
  let gzip = 0;
  for (const file of files) {
    const buffer = readFileSync(join(dir, file));
    raw += buffer.length;
    gzip += gzipBytes(buffer);
  }
  return { files, raw, gzip };
}

export function checkBudget(result, gzipMax) {
  const ok = result.gzip <= gzipMax;
  return {
    ok,
    message: ok
      ? `${result.gzip} B gzip <= ${gzipMax} B`
      : `${result.gzip} B gzip > ${gzipMax} B budget (over by ${result.gzip - gzipMax} B)`,
  };
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("usage: node scripts/size.mjs <file> [<file> ...]");
    process.exit(2);
  }
  let raw = 0;
  let gzip = 0;
  for (const file of files) {
    const buffer = readFileSync(file);
    const g = gzipBytes(buffer);
    raw += buffer.length;
    gzip += g;
    console.log(`${String(buffer.length).padStart(9)} raw  ${String(g).padStart(8)} gzip  ${file}`);
  }
  console.log(`${String(raw).padStart(9)} raw  ${String(gzip).padStart(8)} gzip  total (${files.length} file(s), zlib default level)`);
}
