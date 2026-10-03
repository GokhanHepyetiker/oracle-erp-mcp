/**
 * Integration tests against the dockerised demo database (`npm run db:up`).
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "../src/config.js";
import { OracleDatabase } from "../src/db.js";
import { loadReports } from "../src/reports.js";
import { createServer } from "../src/server.js";

const config = loadConfig({
  ORACLE_USER: "mcp_reader",
  ORACLE_PASSWORD: "McpReader#2026",
  ORACLE_CONNECT_STRING: "localhost:1521/FREEPDB1",
  ORACLE_SCHEMA: "ERP_DEMO",
  ...process.env,
});

const jsonOf = (r: unknown) => {
  const res = r as CallToolResult;
  const text = (res.content[0] as { text: string }).text;
  assert.notEqual(res.isError, true, text);
  return JSON.parse(text);
};

describe("integration: Oracle demo ERP", () => {
  const db = new OracleDatabase(config);
  const client = new Client({ name: "integration", version: "1.0.0" });

  before(async () => {
    const reports = await loadReports(config.reportsFile);
    const server = createServer({ db, reports, schema: config.schema, maxRows: config.maxRows });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(st), client.connect(ct)]);
  });

  after(async () => {
    await client.close();
    await db.close();
  });

  it("lists the ERP tables with comments and statistics", async () => {
    const res = jsonOf(await client.callTool({ name: "list_tables", arguments: {} }));
    const names = res.tables.map((t: { name: string }) => t.name);
    for (const t of ["ITEMS", "PURCHASE_ORDERS", "STOCK_MOVEMENTS", "SUPPLIERS", "WEIGHBRIDGE_TICKETS", "WORK_ORDERS"]) {
      assert.ok(names.includes(t), `missing ${t}`);
    }
    const suppliers = res.tables.find((t: { name: string }) => t.name === "SUPPLIERS");
    assert.match(suppliers.comment, /Vendors/);
    assert.equal(suppliers.approxRows, 15);
  });

  it("describes columns, primary and foreign keys", async () => {
    const res = jsonOf(
      await client.callTool({ name: "describe_table", arguments: { table: "erp_demo.purchase_order_lines" } }),
    );
    assert.deepEqual(res.primaryKey, ["PO_LINE_ID"]);
    const refs = res.foreignKeys.map((f: { referencedTable: string }) => f.referencedTable).sort();
    assert.deepEqual(refs, ["ITEMS", "PURCHASE_ORDERS"]);
    const qty = res.columns.find((c: { name: string }) => c.name === "QUANTITY");
    assert.equal(qty.dataType, "NUMBER(14,3)");
    assert.equal(qty.nullable, false);
  });

  it("runs ad-hoc queries and formats dates without timezone shifts", async () => {
    const res = jsonOf(
      await client.callTool({
        name: "run_query",
        arguments: {
          sql: "SELECT DATE '2026-01-15' AS d, TO_DATE('2026-01-15 13:45:00','YYYY-MM-DD HH24:MI:SS') AS dt, COUNT(*) AS n FROM erp_demo.suppliers",
        },
      }),
    );
    assert.deepEqual(res.rows, [{ D: "2026-01-15", DT: "2026-01-15 13:45:00", N: 15 }]);
  });

  it("flags truncated results", async () => {
    const res = jsonOf(
      await client.callTool({
        name: "run_query",
        arguments: { sql: "SELECT po_number FROM erp_demo.purchase_orders ORDER BY po_number", max_rows: 5 },
      }),
    );
    assert.equal(res.rowCount, 5);
    assert.equal(res.truncated, true);
  });

  it("runs every curated report", async () => {
    const list = jsonOf(await client.callTool({ name: "list_reports", arguments: {} }));
    for (const r of list) {
      const res = jsonOf(await client.callTool({ name: "run_report", arguments: { name: r.name } }));
      assert.ok(res.rowCount > 0, `${r.name} returned no rows`);
    }
  });

  it("reports realistic demo insights", async () => {
    const quality = jsonOf(
      await client.callTool({
        name: "run_report",
        arguments: { name: "waste_paper_quality", params: { date_from: "2025-01-01", date_to: "2026-09-30" } },
      }),
    );
    assert.ok(["SUP-004", "SUP-005", "SUP-014"].includes(quality.rows[0].SUPPLIER_CODE));

    const stock = jsonOf(await client.callTool({ name: "run_report", arguments: { name: "stock_balance" } }));
    assert.ok(stock.rows.every((r: { BALANCE_QTY: number }) => r.BALANCE_QTY > 0), "negative stock balance");
  });

  describe("database-level read-only enforcement (guard bypassed)", () => {
    it("blocks DML through missing privileges", async () => {
      await assert.rejects(db.query("DELETE FROM erp_demo.items", 10), /ORA-/);
    });

    it("blocks row locking because only READ is granted", async () => {
      await assert.rejects(db.query("SELECT * FROM erp_demo.items FOR UPDATE", 10), /ORA-/);
    });

    it("blocks DDL", async () => {
      await assert.rejects(db.query("CREATE TABLE erp_demo.x (a NUMBER)", 10), /ORA-/);
    });
  });
});
