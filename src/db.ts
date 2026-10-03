import oracledb from "oracledb";
import type { AppConfig } from "./config.js";
import { buildReportCall, type ReportDefinition, type ReportParamValue } from "./reports.js";

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  elapsedMs: number;
}

export interface TableSummary {
  name: string;
  type: "TABLE" | "VIEW";
  comment: string | null;
  approxRows: number | null;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  comment: string | null;
}

export interface ForeignKeyInfo {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

export interface TableDescription {
  schema: string;
  name: string;
  comment: string | null;
  columns: ColumnInfo[];
  primaryKey: string[];
  foreignKeys: ForeignKeyInfo[];
}

/** Abstraction used by the MCP tools; makes the server testable without Oracle. */
export interface Database {
  listTables(filter?: string): Promise<TableSummary[]>;
  describeTable(table: string): Promise<TableDescription | null>;
  query(sql: string, maxRows: number): Promise<QueryResult>;
  runReport(report: ReportDefinition, params: ReportParamValue[], maxRows: number): Promise<QueryResult>;
  close(): Promise<void>;
}

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

/** Formats Oracle DATE/TIMESTAMP values using wall-clock time to avoid timezone day shifts. */
function formatDate(d: Date): string {
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) {
    return date;
  }
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function normaliseValue(value: unknown): unknown {
  if (value instanceof Date) return formatDate(value);
  if (Buffer.isBuffer(value)) return `<BINARY ${value.length} bytes>`;
  if (value !== null && typeof value === "object" && typeof (value as { getData?: unknown }).getData === "function") {
    return "<LOB>";
  }
  return value;
}

const fetchTypeHandler = (meta: oracledb.Metadata<unknown>): oracledb.FetchTypeResponse | undefined => {
  if (meta.dbType === oracledb.DB_TYPE_CLOB || meta.dbType === oracledb.DB_TYPE_NCLOB) {
    return { type: oracledb.STRING };
  }
  if (meta.dbType === oracledb.DB_TYPE_BLOB) {
    return { type: oracledb.BUFFER };
  }
  return undefined;
};

function toResult(
  meta: Array<{ name: string }> | undefined,
  rawRows: Record<string, unknown>[],
  maxRows: number,
  started: number,
): QueryResult {
  const truncated = rawRows.length > maxRows;
  const rows = rawRows.slice(0, maxRows).map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) out[k] = normaliseValue(v);
    return out;
  });
  return {
    columns: (meta ?? []).map((m) => m.name),
    rows,
    rowCount: rows.length,
    truncated,
    elapsedMs: Date.now() - started,
  };
}

const IDENT = /^[A-Za-z][A-Za-z0-9_$#]{0,127}$/;

export class OracleDatabase implements Database {
  private pool: oracledb.Pool | undefined;
  private poolPromise: Promise<oracledb.Pool> | undefined;

  constructor(private readonly cfg: AppConfig) {}

  private getPool(): Promise<oracledb.Pool> {
    if (this.pool) return Promise.resolve(this.pool);
    this.poolPromise ??= oracledb
      .createPool({
        user: this.cfg.oracle.user,
        password: this.cfg.oracle.password,
        connectString: this.cfg.oracle.connectString,
        poolMin: 0,
        poolMax: 4,
        poolIncrement: 1,
        poolTimeout: 60,
      })
      .then((p) => {
        this.pool = p;
        return p;
      })
      .catch((err) => {
        this.poolPromise = undefined;
        throw err;
      });
    return this.poolPromise;
  }

  /** Every call runs in its own READ ONLY transaction which is always rolled back. */
  private async withReadOnlyConnection<T>(fn: (conn: oracledb.Connection) => Promise<T>): Promise<T> {
    const pool = await this.getPool();
    const conn = await pool.getConnection();
    conn.callTimeout = this.cfg.queryTimeoutMs;
    try {
      await conn.execute("SET TRANSACTION READ ONLY");
      return await fn(conn);
    } finally {
      try {
        await conn.rollback();
      } catch {
        // connection may already be broken; closing below is what matters
      }
      await conn.close();
    }
  }

  private rows<T>(conn: oracledb.Connection, sql: string, binds: oracledb.BindParameters) {
    return conn
      .execute<T>(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT })
      .then((r) => r.rows ?? []);
  }

  async listTables(filter?: string): Promise<TableSummary[]> {
    return this.withReadOnlyConnection(async (conn) => {
      const rows = await this.rows<{
        TABLE_NAME: string;
        TABLE_TYPE: "TABLE" | "VIEW";
        COMMENTS: string | null;
        NUM_ROWS: number | null;
      }>(
        conn,
        `SELECT c.table_name, c.table_type, c.comments, t.num_rows
           FROM all_tab_comments c
           LEFT JOIN all_tables t ON t.owner = c.owner AND t.table_name = c.table_name
          WHERE c.owner = :owner
            AND c.table_name NOT LIKE 'BIN$%'
            AND (:filter IS NULL OR INSTR(c.table_name, UPPER(:filter)) > 0)
          ORDER BY c.table_name`,
        { owner: this.cfg.schema, filter: filter?.trim() || null },
      );
      return rows.map((r) => ({
        name: r.TABLE_NAME,
        type: r.TABLE_TYPE,
        comment: r.COMMENTS,
        approxRows: r.NUM_ROWS,
      }));
    });
  }

  async describeTable(table: string): Promise<TableDescription | null> {
    let name = table.trim();
    const prefix = `${this.cfg.schema}.`;
    if (name.toUpperCase().startsWith(prefix)) name = name.slice(prefix.length);
    if (!IDENT.test(name)) throw new Error(`Invalid table name: ${table}`);
    name = name.toUpperCase();
    const binds = { owner: this.cfg.schema, tbl: name };

    return this.withReadOnlyConnection(async (conn) => {
      const columns = await this.rows<{
        COLUMN_NAME: string;
        DATA_TYPE: string;
        DATA_LENGTH: number;
        DATA_PRECISION: number | null;
        DATA_SCALE: number | null;
        CHAR_LENGTH: number;
        CHAR_USED: string | null;
        NULLABLE: string;
        COMMENTS: string | null;
      }>(
        conn,
        `SELECT c.column_name, c.data_type, c.data_length, c.data_precision, c.data_scale,
                c.char_length, c.char_used, c.nullable, cc.comments
           FROM all_tab_columns c
           LEFT JOIN all_col_comments cc
             ON cc.owner = c.owner AND cc.table_name = c.table_name AND cc.column_name = c.column_name
          WHERE c.owner = :owner AND c.table_name = :tbl
          ORDER BY c.column_id`,
        binds,
      );
      if (columns.length === 0) return null;

      const [comment] = await this.rows<{ COMMENTS: string | null }>(
        conn,
        `SELECT comments FROM all_tab_comments WHERE owner = :owner AND table_name = :tbl`,
        binds,
      );

      const pk = await this.rows<{ COLUMN_NAME: string }>(
        conn,
        `SELECT cc.column_name
           FROM all_constraints c
           JOIN all_cons_columns cc ON cc.owner = c.owner AND cc.constraint_name = c.constraint_name
          WHERE c.owner = :owner AND c.table_name = :tbl AND c.constraint_type = 'P'
          ORDER BY cc.position`,
        binds,
      );

      const fkRows = await this.rows<{
        CONSTRAINT_NAME: string;
        COLUMN_NAME: string;
        REF_TABLE: string;
        REF_COLUMN: string;
      }>(
        conn,
        `SELECT c.constraint_name, cc.column_name, rc.table_name AS ref_table, rcc.column_name AS ref_column
           FROM all_constraints c
           JOIN all_cons_columns cc ON cc.owner = c.owner AND cc.constraint_name = c.constraint_name
           JOIN all_constraints rc ON rc.owner = c.r_owner AND rc.constraint_name = c.r_constraint_name
           JOIN all_cons_columns rcc
             ON rcc.owner = rc.owner AND rcc.constraint_name = rc.constraint_name AND rcc.position = cc.position
          WHERE c.owner = :owner AND c.table_name = :tbl AND c.constraint_type = 'R'
          ORDER BY c.constraint_name, cc.position`,
        binds,
      );

      const fks = new Map<string, ForeignKeyInfo>();
      for (const r of fkRows) {
        const fk = fks.get(r.CONSTRAINT_NAME) ?? {
          name: r.CONSTRAINT_NAME,
          columns: [],
          referencedTable: r.REF_TABLE,
          referencedColumns: [],
        };
        fk.columns.push(r.COLUMN_NAME);
        fk.referencedColumns.push(r.REF_COLUMN);
        fks.set(r.CONSTRAINT_NAME, fk);
      }

      return {
        schema: this.cfg.schema,
        name,
        comment: comment?.COMMENTS ?? null,
        columns: columns.map((c) => ({
          name: c.COLUMN_NAME,
          dataType: formatType(c),
          nullable: c.NULLABLE === "Y",
          comment: c.COMMENTS,
        })),
        primaryKey: pk.map((p) => p.COLUMN_NAME),
        foreignKeys: [...fks.values()],
      };
    });
  }

  async query(sql: string, maxRows: number): Promise<QueryResult> {
    return this.withReadOnlyConnection(async (conn) => {
      const started = Date.now();
      const res = await conn.execute<Record<string, unknown>>(sql, [], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        maxRows: maxRows + 1,
        fetchTypeHandler,
      });
      return toResult(res.metaData, res.rows ?? [], maxRows, started);
    });
  }

  async runReport(report: ReportDefinition, params: ReportParamValue[], maxRows: number): Promise<QueryResult> {
    const binds: Record<string, oracledb.BindParameter> = {};
    params.forEach((value, i) => {
      binds[`p${i}`] =
        typeof value === "number"
          ? { val: value, type: oracledb.NUMBER }
          : { val: value, type: oracledb.STRING };
    });
    binds.cursor = { dir: oracledb.BIND_OUT, type: oracledb.CURSOR };

    return this.withReadOnlyConnection(async (conn) => {
      const started = Date.now();
      const res = await conn.execute<Record<string, unknown>>(buildReportCall(report), binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchTypeHandler,
      });
      const rs = (res.outBinds as { cursor: oracledb.ResultSet<Record<string, unknown>> }).cursor;
      try {
        const rows = await rs.getRows(maxRows + 1);
        return toResult(rs.metaData, rows, maxRows, started);
      } finally {
        await rs.close();
      }
    });
  }

  async close(): Promise<void> {
    const pool = this.pool ?? (this.poolPromise ? await this.poolPromise.catch(() => undefined) : undefined);
    this.pool = undefined;
    this.poolPromise = undefined;
    if (pool) await pool.close(5);
  }
}

function formatType(c: {
  DATA_TYPE: string;
  DATA_LENGTH: number;
  DATA_PRECISION: number | null;
  DATA_SCALE: number | null;
  CHAR_LENGTH: number;
  CHAR_USED: string | null;
}): string {
  switch (c.DATA_TYPE) {
    case "NUMBER":
      if (c.DATA_PRECISION == null) return c.DATA_SCALE === 0 ? "NUMBER(*,0)" : "NUMBER";
      return c.DATA_SCALE ? `NUMBER(${c.DATA_PRECISION},${c.DATA_SCALE})` : `NUMBER(${c.DATA_PRECISION})`;
    case "VARCHAR2":
    case "NVARCHAR2":
    case "CHAR":
    case "NCHAR":
      return `${c.DATA_TYPE}(${c.CHAR_LENGTH}${c.CHAR_USED === "C" ? " CHAR" : ""})`;
    case "RAW":
      return `RAW(${c.DATA_LENGTH})`;
    default:
      return c.DATA_TYPE;
  }
}
