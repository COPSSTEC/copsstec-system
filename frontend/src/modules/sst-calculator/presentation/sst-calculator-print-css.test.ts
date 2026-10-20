import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = fileURLToPath(new URL("./sst-calculator.css", import.meta.url));

describe("SST proposal print CSS regression", () => {
  it("keeps the proposal in normal paginated flow without unbreakable whole sections", () => {
    const css = readFileSync(cssPath, "utf8");
    const printCss = css.slice(css.lastIndexOf("@media print"));

    expect(printCss).not.toMatch(/\.sst-proposal-section\s*\{[^}]*break-inside\s*:\s*avoid(?:-page)?/s);
    expect(printCss).not.toMatch(/\.sst-proposal-section\s*\{[^}]*page-break-inside\s*:\s*avoid/s);
    expect(printCss).not.toMatch(/min-height\s*:\s*297mm/i);
    expect(printCss).not.toMatch(/position\s*:\s*absolute/i);
    expect(printCss).toMatch(/\.sst-proposal-page\s*\{[^}]*position\s*:\s*static/s);
  });
});
