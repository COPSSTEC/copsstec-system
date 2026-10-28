import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = fileURLToPath(new URL("./sst-calculator.css", import.meta.url));
const stylesheet = readFileSync(cssPath, "utf8");

describe("Cotiza SST presentation styles", () => {
  it("keeps the proposal in normal paginated flow without unbreakable whole sections", () => {
    const printCss = stylesheet.slice(stylesheet.lastIndexOf("@media print"));

    expect(printCss).not.toMatch(/\.sst-proposal-section\s*\{[^}]*break-inside\s*:\s*avoid(?:-page)?/);
    expect(printCss).not.toMatch(/\.sst-proposal-section\s*\{[^}]*page-break-inside\s*:\s*avoid/);
    expect(printCss).not.toMatch(/min-height\s*:\s*297mm/i);
    expect(printCss).not.toMatch(/position\s*:\s*absolute/i);
    expect(printCss).toMatch(/\.sst-proposal-page\s*\{[^}]*position\s*:\s*static/);
  });

  it("keeps proposal logos bounded for screen and A4 print layouts", () => {
    expect(stylesheet).toContain(".sst-issuer-header-cell");
    expect(stylesheet).toContain(".sst-issuer-logo");
    expect(stylesheet).toContain(".sst-pdf-footer img");
    expect(stylesheet).toContain("size: A4 portrait");
  });

  it("allows complete CIIU descriptions to wrap instead of truncating each option", () => {
    expect(stylesheet).toContain(".sst-ciiu-description");
    expect(stylesheet).toMatch(/\.sst-ciiu-description[\s\S]*overflow-wrap:\s*anywhere/);
    expect(stylesheet).toMatch(/\.sst-ciiu-description[\s\S]*white-space:\s*normal/);
    expect(stylesheet).not.toMatch(/\.sst-ciiu-description[\s\S]*text-overflow/);
  });
});
