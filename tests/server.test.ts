import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Database, QueryResult, TableDescription, TableSummary } from "../src/db.js";
import type { ReportDefinition, ReportParamValue } from "../src/reports.js";
import { createServer, type AuditEvent } from "../src/server.js";

class FakeDatabase implements Database {
  queries: Array<{ sql: string; maxRows: number }> = [];
  reportCalls: Array<{ name: string; params: ReportParamValue[]; maxRows: number }> = [];

  async listTables(filter?: string): Promise<TableSummary[]> {
    const all: TableSummary[] = [
      { name: "ITEMS", type: "TABLE", comment: "Item master", approxRows: 20 },
      { name: "SUPPLIERS", type: "TABLE", comment: "Vendors", approxRows: 15 },
    ];
    return filter ? all.filter((t) => t.name.includes(filter.toUpperCase())) : all;
  }

  async describeTable(table: string): Promise<TableDescription | null> {
    if (table.toUpperCase() !== "ITEMS") return null;
    return {
      schema: "ERP_DEMO",
      name: "ITEMS",
      comment: "Item master",
      columns: [{ name: "ITEM_ID", dataType: "NUMBER", nullable: false, comment: null }],
      primaryKey: ["ITEM_ID"],
      foreignKeys: [],
    };
  }

  async query(sql: string, maxRows: number): Promise<QueryResult> {
    this.queries.push({ sql, maxRows });
    return { columns: ["X"], rows: [{ X: 1 }], rowCount: 1, truncated: false, elapsedMs: 1 };
  }

  async runReport(report: ReportDefinition, params: ReportParamValue[], maxRows: number): Promise<QueryResult> {
    this.reportCalls.push({ name: report.name, params, maxRows });
    return { columns: ["Y"], rows: [{ Y: 2 }], rowCount: 1, truncated: false, elapsedMs: 1 };
  }

  async close() {}
}

const reports: ReportDefinition[] = [
  {
    name: "stock_balance",
    description: "Stock per warehouse",
    procedure: "ERP_DEMO.ERP_REPORTS.STOCK_BALANCE",
    parameters: [
      { name: "warehouse_code", type: "string", description: "", required: false },
      { name: "category", type: "string", description: "", required: false },
    ],
  },
];

const textOf = (r: unknown) => ((r as CallToolResult).content[0] as { text: string }).text;
const jsonOf = (r: unknown) => JSON.parse(textOf(r));

describe("MCP server", () => {
  const db = new FakeDatabase();
  const events: AuditEvent[] = [];
  const client = new Client({ name: "test-client", version: "1.0.0" });

  before(async () => {
    const server = createServer({ db, reports, schema: "ERP_DEMO", maxRows: 50, audit: (e) => events.push(e) });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  after(async () => {
    await client.close();
  });

  it("advertises read-only tools and instructions", async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), [
      "describe_table",
      "list_reports",
      "list_tables",
      "run_query",
      "run_report",
    ]);
    for (const t of tools) assert.equal(t.annotations?.readOnlyHint, true, t.name);
    assert.match(client.getInstructions() ?? "", /read-only/);
  });

  it("list_tables passes the filter through", async () => {
    const res = jsonOf(await client.callTool({ name: "list_tables", arguments: { filter: "sup" } }));
    assert.equal(res.count, 1);
    assert.equal(res.tables[0].name, "SUPPLIERS");
  });

  it("describe_table returns metadata or a clear error", async () => {
    const ok = jsonOf(await client.callTool({ name: "describe_table", arguments: { table: "items" } }));
    assert.deepEqual(ok.primaryKey, ["ITEM_ID"]);

    const missing = await client.callTool({ name: "describe_table", arguments: { table: "nope" } });
    assert.equal(missing.isError, true);
    assert.match(textOf(missing), /not found/);
  });

  it("run_query executes guarded SQL with the default row limit", async () => {
    const res = jsonOf(await client.callTool({ name: "run_query", arguments: { sql: "SELECT 1 AS x FROM dual;" } }));
    assert.deepEqual(res.rows, [{ X: 1 }]);
    assert.deepEqual(db.queries.at(-1), { sql: "SELECT 1 AS x FROM dual", maxRows: 50 });
  });

  it("run_query rejects writes before they reach the database", async () => {
    const before = db.queries.length;
    const res = await client.callTool({ name: "run_query", arguments: { sql: "DELETE FROM erp_demo.items" } });
    assert.equal(res.isError, true);
    assert.match(textOf(res), /Query rejected/);
    assert.equal(db.queries.length, before);
    assert.equal(events.at(-1)?.ok, false);
  });

  it("run_query enforces the configured max_rows ceiling", async () => {
    const res = await client.callTool({ name: "run_query", arguments: { sql: "SELECT 1 FROM dual", max_rows: 51 } });
    assert.equal(res.isError, true);
  });

  it("list_reports and run_report expose curated reports", async () => {
    const list = jsonOf(await client.callTool({ name: "list_reports", arguments: {} }));
    assert.equal(list[0].name, "stock_balance");

    const res = jsonOf(
      await client.callTool({
        name: "run_report",
        arguments: { name: "stock_balance", params: { category: "RAW_MATERIAL" }, max_rows: 10 },
      }),
    );
    assert.deepEqual(res.rows, [{ Y: 2 }]);
    assert.deepEqual(db.reportCalls.at(-1), { name: "stock_balance", params: [null, "RAW_MATERIAL"], maxRows: 10 });
  });

  it("run_report rejects unknown reports and parameters", async () => {
    const unknown = await client.callTool({ name: "run_report", arguments: { name: "drop_everything" } });
    assert.equal(unknown.isError, true);
    assert.match(textOf(unknown), /Available reports: stock_balance/);

    const badParam = await client.callTool({
      name: "run_report",
      arguments: { name: "stock_balance", params: { evil: "x" } },
    });
    assert.equal(badParam.isError, true);
  });

  it("writes an audit event for every call", () => {
    assert.ok(events.length >= 8);
    assert.ok(events.every((e) => typeof e.elapsedMs === "number" && typeof e.tool === "string"));
  });
});
