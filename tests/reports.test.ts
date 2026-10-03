import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildReportCall, loadReports, parseReports, resolveReportParams, type ReportDefinition } from "../src/reports.js";

const report: ReportDefinition = parseReports({
  reports: [
    {
      name: "demo",
      description: "Demo report",
      procedure: "ERP_DEMO.ERP_REPORTS.DEMO",
      parameters: [
        { name: "date_from", type: "date", required: true },
        { name: "warehouse", type: "string" },
        { name: "year", type: "number" },
      ],
    },
  ],
})[0]!;

describe("parseReports", () => {
  it("applies defaults", () => {
    assert.equal(report.parameters[1]!.required, false);
    assert.equal(report.parameters[1]!.description, "");
  });

  it("rejects unsafe procedure names", () => {
    assert.throws(() =>
      parseReports({
        reports: [{ name: "x", description: "x", procedure: "erp.p; DROP TABLE t", parameters: [] }],
      }),
    );
  });

  it("rejects duplicate report names", () => {
    const r = { name: "x", description: "x", procedure: "erp.p" };
    assert.throws(() => parseReports({ reports: [r, r] }), /Duplicate/);
  });

  it("loads the bundled config/reports.json", async () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const reports = await loadReports(path.join(root, "config", "reports.json"));
    assert.ok(reports.length >= 5);
  });

  it("returns an empty list when the file does not exist", async () => {
    assert.deepEqual(await loadReports("does-not-exist.json"), []);
  });
});

describe("resolveReportParams", () => {
  it("returns values in declaration order with type conversion", () => {
    assert.deepEqual(resolveReportParams(report, { year: "2026", date_from: "2026-01-31", warehouse: "W01" }), [
      "2026-01-31",
      "W01",
      2026,
    ]);
  });

  it("is case-insensitive for parameter names and fills optional ones with null", () => {
    assert.deepEqual(resolveReportParams(report, { DATE_FROM: "2026-01-01" }), ["2026-01-01", null, null]);
  });

  it("rejects missing required parameters", () => {
    assert.throws(() => resolveReportParams(report, {}), /Missing required parameter "date_from"/);
  });

  it("rejects unknown parameters", () => {
    assert.throws(() => resolveReportParams(report, { date_from: "2026-01-01", foo: 1 }), /Unknown parameter/);
  });

  it("rejects malformed dates and numbers", () => {
    assert.throws(() => resolveReportParams(report, { date_from: "01.01.2026" }), /YYYY-MM-DD/);
    assert.throws(() => resolveReportParams(report, { date_from: "2026-01-01", year: "abc" }), /number/);
  });
});

describe("buildReportCall", () => {
  it("binds parameters positionally and converts dates", () => {
    assert.equal(
      buildReportCall(report),
      "BEGIN ERP_DEMO.ERP_REPORTS.DEMO(TO_DATE(:p0, 'YYYY-MM-DD'), :p1, :p2, :cursor); END;",
    );
  });
});
