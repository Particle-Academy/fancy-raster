import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";
import { checkBudget, esmClosure, gzipBytes, measure } from "../scripts/size.mjs";

// The size tooling is itself a check, so it gets proven before the budget test
// trusts it: a closure walker that silently stops at the first file would make
// every budget pass.

const dir = mkdtempSync(join(tmpdir(), "fancy-raster-size-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

writeFileSync(join(dir, "a.js"), 'import { b } from "./b.js";\nimport "./c.js";\nexport { x } from "./shared.js";\nexport const a = b;\n');
writeFileSync(join(dir, "b.js"), 'import { s } from "./shared.js";\nexport const b = s;\n');
writeFileSync(join(dir, "c.js"), 'const lazy = () => import("./lazy.js");\nexport default lazy;\n');
writeFileSync(join(dir, "shared.js"), "export const s = 1; export const x = 2;\n");
writeFileSync(join(dir, "lazy.js"), "export const big = " + JSON.stringify("z".repeat(5000)) + ";\n");
writeFileSync(join(dir, "min.js"), 'import{s as q}from"./shared.js";export*from"./b.js";const l=()=>import("./lazy.js");export{q,l};');
writeFileSync(join(dir, "ext.js"), 'import "node:fs";\nimport "some-package";\nexport {};\n');

describe("gzipBytes", () => {
  it("is the length of Node's own gzip at the default level", () => {
    const text = "fancy-raster ".repeat(200);
    expect(gzipBytes(Buffer.from(text))).toBe(gzipSync(Buffer.from(text)).length);
  });
});

describe("esmClosure", () => {
  it("follows static imports and re-exports, once per file", () => {
    expect(esmClosure(dir, "a.js").sort()).toEqual(["a.js", "b.js", "c.js", "shared.js"]);
  });

  it("does not count a dynamic import: that chunk is lazy", () => {
    expect(esmClosure(dir, "c.js")).not.toContain("lazy.js");
  });

  it("reads minified imports and re-exports too", () => {
    expect(esmClosure(dir, "min.js").sort()).toEqual(["b.js", "min.js", "shared.js"]);
  });

  it("ignores bare and node: specifiers", () => {
    expect(esmClosure(dir, "ext.js")).toEqual(["ext.js"]);
  });

  it("fails loudly on a missing entry rather than measuring nothing", () => {
    expect(() => esmClosure(dir, "nope.js")).toThrow(/nope\.js/);
  });
});

describe("measure", () => {
  it("sums per-file gzip over the closure, minus anything already loaded", () => {
    const all = measure(dir, ["a.js"]);
    expect(all.files.sort()).toEqual(["a.js", "b.js", "c.js", "shared.js"]);
    expect(all.gzip).toBeGreaterThan(0);

    const beyond = measure(dir, ["a.js"], ["b.js"]);
    expect(beyond.files.sort()).toEqual(["a.js", "c.js"]);
    expect(beyond.gzip).toBeLessThan(all.gzip);
  });
});

describe("checkBudget", () => {
  it("passes at the ceiling and fails one byte over it", () => {
    expect(checkBudget({ gzip: 100 }, 100).ok).toBe(true);
    const over = checkBudget({ gzip: 101 }, 100);
    expect(over.ok).toBe(false);
    expect(over.message).toMatch(/101 B gzip > 100 B/);
  });
});
