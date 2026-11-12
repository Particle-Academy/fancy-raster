import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));

describe("package.json", () => {
  it("has zero runtime dependencies (the plan's core promise)", () => {
    expect(pkg.dependencies ?? {}).toEqual({});
    expect(pkg.peerDependencies ?? {}).toEqual({});
    expect(pkg.optionalDependencies ?? {}).toEqual({});
  });

  it("is publishable by OIDC: repository url matches the repo", () => {
    expect(pkg.name).toBe("@particle-academy/fancy-raster");
    expect(pkg.repository.url).toBe("git+https://github.com/Particle-Academy/fancy-raster.git");
    expect(pkg.publishConfig.access).toBe("public");
  });

  it("ships its changelog and has a test script", () => {
    expect(pkg.files).toContain("CHANGELOG.md");
    expect(pkg.files).toContain("dist");
    expect(pkg.scripts.test).toBeTruthy();
  });
});
