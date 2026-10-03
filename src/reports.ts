import { readFile } from "node:fs/promises";
import { z } from "zod";

const IDENT = /^[A-Za-z][A-Za-z0-9_$#]{0,127}$/;
const PROCEDURE_NAME = /^[A-Za-z][A-Za-z0-9_$#]{0,127}(\.[A-Za-z][A-Za-z0-9_$#]{0,127}){0,2}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const parameterSchema = z.object({
  name: z.string().regex(IDENT, "parameter name must be a plain identifier"),
  type: z.enum(["string", "number", "date"]),
  description: z.string().default(""),
  required: z.boolean().default(false),
});

const reportSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/, "report name must be snake_case"),
  title: z.string().optional(),
  description: z.string().min(1),
  procedure: z.string().regex(PROCEDURE_NAME, "procedure must be [schema.][package.]procedure"),
  parameters: z.array(parameterSchema).default([]),
});

const fileSchema = z.object({ reports: z.array(reportSchema) });

export type ReportParameter = z.infer<typeof parameterSchema>;
export type ReportDefinition = z.infer<typeof reportSchema>;
export type ReportParamValue = string | number | null;

export function parseReports(json: unknown): ReportDefinition[] {
  const { reports } = fileSchema.parse(json);
  const seen = new Set<string>();
  for (const r of reports) {
    if (seen.has(r.name)) throw new Error(`Duplicate report name: ${r.name}`);
    seen.add(r.name);
  }
  return reports;
}

export async function loadReports(file: string): Promise<ReportDefinition[]> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  try {
    return parseReports(JSON.parse(raw));
  } catch (err) {
    throw new Error(`Invalid reports file ${file}: ${(err as Error).message}`);
  }
}

/**
 * Validates user-supplied arguments against the report definition and
 * returns them in declaration order, ready for positional binding.
 */
export function resolveReportParams(
  report: ReportDefinition,
  args: Record<string, unknown> = {},
): ReportParamValue[] {
  const known = new Set(report.parameters.map((p) => p.name.toLowerCase()));
  const normalised = new Map<string, unknown>();
  for (const [key, value] of Object.entries(args)) {
    if (!known.has(key.toLowerCase())) {
      throw new Error(`Unknown parameter "${key}" for report "${report.name}"`);
    }
    normalised.set(key.toLowerCase(), value);
  }

  return report.parameters.map((p) => {
    const value = normalised.get(p.name.toLowerCase());
    if (value === undefined || value === null || value === "") {
      if (p.required) throw new Error(`Missing required parameter "${p.name}"`);
      return null;
    }
    switch (p.type) {
      case "number": {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n)) throw new Error(`Parameter "${p.name}" must be a number`);
        return n;
      }
      case "date": {
        const s = String(value);
        if (!ISO_DATE.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) {
          throw new Error(`Parameter "${p.name}" must be a date in YYYY-MM-DD format`);
        }
        return s;
      }
      default:
        return String(value);
    }
  });
}

/** Builds the anonymous PL/SQL block used to call a SYS_REFCURSOR report procedure. */
export function buildReportCall(report: ReportDefinition): string {
  const args = report.parameters.map((p, i) =>
    p.type === "date" ? `TO_DATE(:p${i}, 'YYYY-MM-DD')` : `:p${i}`,
  );
  args.push(":cursor");
  return `BEGIN ${report.procedure}(${args.join(", ")}); END;`;
}
