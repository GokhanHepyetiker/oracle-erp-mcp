#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { OracleDatabase } from "./db.js";
import { loadReports } from "./reports.js";
import { createServer, stderrAuditLogger } from "./server.js";

async function main() {
  const config = loadConfig();
  const reports = await loadReports(config.reportsFile);
  const db = new OracleDatabase(config);

  const server = createServer({
    db,
    reports,
    schema: config.schema,
    maxRows: config.maxRows,
    audit: stderrAuditLogger,
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await server.close();
      await db.close();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.stdin.on("close", shutdown);

  await server.connect(new StdioServerTransport());
  console.error(
    `oracle-erp-mcp ready: schema=${config.schema}, reports=${reports.length}, maxRows=${config.maxRows}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
