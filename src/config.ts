import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const HARD_MAX_ROWS = 1000;

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const envSchema = z.object({
  ORACLE_USER: z.string().min(1, "ORACLE_USER is required"),
  ORACLE_PASSWORD: z.string().min(1, "ORACLE_PASSWORD is required"),
  ORACLE_CONNECT_STRING: z.string().min(1, "ORACLE_CONNECT_STRING is required"),
  ORACLE_SCHEMA: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9_$#]{0,127}$/, "ORACLE_SCHEMA must be a plain Oracle identifier"),
  MCP_MAX_ROWS: z.coerce.number().int().min(1).max(HARD_MAX_ROWS).default(200),
  MCP_QUERY_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300_000).default(15_000),
  MCP_REPORTS_FILE: z.string().optional(),
});

export interface AppConfig {
  oracle: {
    user: string;
    password: string;
    connectString: string;
  };
  schema: string;
  maxRows: number;
  queryTimeoutMs: number;
  reportsFile: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  const e = parsed.data;
  return {
    oracle: {
      user: e.ORACLE_USER,
      password: e.ORACLE_PASSWORD,
      connectString: e.ORACLE_CONNECT_STRING,
    },
    schema: e.ORACLE_SCHEMA.toUpperCase(),
    maxRows: e.MCP_MAX_ROWS,
    queryTimeoutMs: e.MCP_QUERY_TIMEOUT_MS,
    reportsFile: e.MCP_REPORTS_FILE
      ? path.resolve(e.MCP_REPORTS_FILE)
      : path.join(packageRoot, "config", "reports.json"),
  };
}
