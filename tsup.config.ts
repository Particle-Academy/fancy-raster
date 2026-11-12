import { defineConfig } from "tsup";

// Every entry here must be covered by a budget in test/size-budget.test.ts, or
// that test fails. Add subpaths (canvas2d, overlay, webgl, fancy-3d) as they land.
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  treeshake: true,
  clean: true,
  sourcemap: true,
  external: ["node:*"],
});
