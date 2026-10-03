import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Database } from "./db.js";
import { resolveReportParams, type ReportDefinition } from "./reports.js";
import { checkReadOnlySql } from "./sqlGuard.js";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

export type AuditEvent = {
  tool: string;
  ok: boolean;
  elapsedMs: number;
  detail?: Record<string, unknown>;
  error?: string;
};

export type AuditLogger = (event: AuditEvent) => void;

/** Logs to stderr: stdout is reserved for the MCP stdio protocol. */
export const stderrAuditLogger: AuditLogger = (event) => {
  process.stderr.write(`${JSON.stringify({ ts: new Date().toISOString(), ...event })}\n`);
};

export interface ServerOptions {
  db: Database;
  reports: ReportDefinition[];
  schema: string;
  maxRows: number;
  audit?: AuditLogger;
}

const INSTRUCTIONS = `This server gives read-only access to an Oracle-based ERP database.
Recommended workflow:
1. Call list_reports first; if a curated report answers the question, prefer run_report.
2. Otherwise call list_tables and describe_table to learn the schema (comments explain business meaning).
3. Write a single Oracle SQL SELECT/WITH statement for run_query. Use Oracle syntax
   (e.g. FETCH FIRST n ROWS ONLY, TRUNC(date), NVL). Always qualify tables with the schema name.
All access is read-only; data-changing statements and PL/SQL are rejected.`;

// Compact JSON keeps large result sets cheap in LLM tokens.
const text = (value: unknown): CallToolResult => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }],
});

export function createServer(opts: ServerOptions): McpServer {
  const { db, reports, schema, maxRows } = opts;
  const audit = opts.audit ?? (() => {});
  const reportsByName = new Map(reports.map((r) => [r.name, r]));

  const server = new McpServer(
    { name: "oracle-erp-mcp", version },
    { instructions: INSTRUCTIONS },
  );

  async function run(
    tool: string,
    detail: Record<string, unknown>,
    fn: () => Promise<{ result: unknown; detail?: Record<string, unknown> }>,
  ): Promise<CallToolResult> {
    const started = Date.now();
    try {
      const { result, detail: extra } = await fn();
      audit({ tool, ok: true, elapsedMs: Date.now() - started, detail: { ...detail, ...extra } });
      return text(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      audit({ tool, ok: false, elapsedMs: Date.now() - started, detail, error: message });
      return { isError: true, content: [{ type: "text", text: `Error: ${message}` }] };
    }
  }

  const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

  server.registerTool(
    "list_tables",
    {
      title: "List ERP tables",
      description: `List tables and views in the ${schema} schema with their business descriptions.`,
      inputSchema: {
        filter: z.string().max(128).optional().describe("Case-insensitive substring of the table name"),
      },
      annotations: { ...readOnly, idempotentHint: true },
    },
    ({ filter }) =>
      run("list_tables", { filter }, async () => {
        const tables = await db.listTables(filter);
        return { result: { schema, count: tables.length, tables }, detail: { count: tables.length } };
      }),
  );

  server.registerTool(
    "describe_table",
    {
      title: "Describe ERP table",
      description:
        "Show columns, data types, comments, primary key and foreign keys of a table or view. Use it before writing SQL.",
      inputSchema: {
        table: z.string().min(1).max(260).describe(`Table or view name, e.g. PURCHASE_ORDERS or ${schema}.ITEMS`),
      },
      annotations: { ...readOnly, idempotentHint: true },
    },
    ({ table }) =>
      run("describe_table", { table }, async () => {
        const description = await db.describeTable(table);
        if (!description) {
          throw new Error(`Table "${table}" was not found in schema ${schema} (or is not accessible)`);
        }
        return { result: description };
      }),
  );

  server.registerTool(
    "run_query",
    {
      title: "Run read-only SQL",
      description: `Execute a single Oracle SELECT/WITH statement and return at most ${maxRows} rows as JSON. Data-changing statements, PL/SQL, DB links and DBMS_/UTL_ packages are rejected.`,
      inputSchema: {
        sql: z.string().min(1).describe("A single Oracle SQL SELECT or WITH statement"),
        max_rows: z
          .number()
          .int()
          .min(1)
          .max(maxRows)
          .optional()
          .describe(`Maximum rows to return (default and upper limit: ${maxRows})`),
      },
      annotations: { ...readOnly, idempotentHint: true },
    },
    ({ sql, max_rows }) =>
      run("run_query", { sql }, async () => {
        const guard = checkReadOnlySql(sql);
        if (!guard.ok) throw new Error(`Query rejected: ${guard.reason}`);
        const result = await db.query(guard.sql, max_rows ?? maxRows);
        return { result, detail: { rowCount: result.rowCount, truncated: result.truncated } };
      }),
  );

  server.registerTool(
    "list_reports",
    {
      title: "List curated reports",
      description:
        "List curated, pre-approved ERP reports (PL/SQL procedures returning SYS_REFCURSOR) and their parameters.",
      inputSchema: {},
      annotations: { ...readOnly, idempotentHint: true },
    },
    () =>
      run("list_reports", {}, async () => ({
        result: reports.map((r) => ({
          name: r.name,
          title: r.title ?? r.name,
          description: r.description,
          parameters: r.parameters,
        })),
      })),
  );

  server.registerTool(
    "run_report",
    {
      title: "Run curated report",
      description: "Run a curated report by name. Use list_reports to see available reports and parameters.",
      inputSchema: {
        name: z.string().min(1).describe("Report name from list_reports"),
        params: z
          .record(z.union([z.string(), z.number(), z.null()]))
          .optional()
          .describe('Report parameters, e.g. {"date_from": "2026-01-01"}. Dates use YYYY-MM-DD.'),
        max_rows: z.number().int().min(1).max(maxRows).optional(),
      },
      annotations: { ...readOnly, idempotentHint: true },
    },
    ({ name, params, max_rows }) =>
      run("run_report", { name, params }, async () => {
        const report = reportsByName.get(name);
        if (!report) {
          const available = [...reportsByName.keys()].join(", ") || "none";
          throw new Error(`Unknown report "${name}". Available reports: ${available}`);
        }
        const values = resolveReportParams(report, params ?? {});
        const result = await db.runReport(report, values, max_rows ?? maxRows);
        return { result, detail: { rowCount: result.rowCount, truncated: result.truncated } };
      }),
  );

  return server;
}
