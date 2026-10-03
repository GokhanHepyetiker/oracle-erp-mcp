/**
 * Static guard for ad-hoc SQL coming from an LLM.
 *
 * This is a defence-in-depth layer only. The primary protection is that the
 * server connects with a database user that has nothing but READ grants, and
 * every statement runs inside a READ ONLY transaction (see db.ts).
 */

export type GuardResult = { ok: true; sql: string } | { ok: false; reason: string };

export const MAX_SQL_LENGTH = 20_000;

const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "UPSERT",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "RENAME",
  "GRANT",
  "REVOKE",
  "AUDIT",
  "NOAUDIT",
  "ANALYZE",
  "COMMIT",
  "ROLLBACK",
  "SAVEPOINT",
  "LOCK",
  "FLASHBACK",
  "PURGE",
  "EXECUTE",
  "EXEC",
  "CALL",
  "BEGIN",
  "DECLARE",
  "FUNCTION",
  "PROCEDURE",
];

// Oracle identifiers may contain $ and #, so \b is not a reliable boundary.
const ID = "A-Za-z0-9_$#";
const keywordPattern = new RegExp(`(?<![${ID}])(${FORBIDDEN_KEYWORDS.join("|")})(?![${ID}])`, "i");

const FORBIDDEN_PATTERNS: Array<[RegExp, string]> = [
  [new RegExp(`(?<![${ID}])DBMS_[${ID}]*`, "i"), "DBMS_* packages are not allowed"],
  [new RegExp(`(?<![${ID}])UTL_[${ID}]*`, "i"), "UTL_* packages are not allowed"],
  [new RegExp(`(?<![${ID}])(OWA_[${ID}]*|HTP|HTF)(?![${ID}])`, "i"), "Web toolkit packages are not allowed"],
  [
    new RegExp(`(?<![${ID}])(HTTPURITYPE|DBURITYPE|XDBURITYPE)(?![${ID}])`, "i"),
    "URI types are not allowed",
  ],
  [/@/, "Database links are not allowed"],
];

const Q_QUOTE_CLOSERS: Record<string, string> = { "[": "]", "{": "}", "(": ")", "<": ">" };

const isIdChar = (c: string | undefined) => c !== undefined && /[A-Za-z0-9_$#]/.test(c);

/**
 * Returns a copy of `sql` with the same length where comments and string
 * literals are blanked out, so keyword checks cannot be fooled by them.
 * Plain quoted identifiers keep their content (so "DBMS_SQL" is still caught).
 */
export function maskSql(sql: string): string {
  const out = sql.split("");
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) {
      if (out[k] !== "\n") out[k] = " ";
    }
  };

  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];

    if (c === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      blank(i, stop);
      i = stop;
      continue;
    }

    if (c === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) throw new Error("Unterminated block comment");
      blank(i, end + 2);
      i = end + 2;
      continue;
    }

    // Alternative quoting: q'[...]', Q'{...}', nq'!...!'
    if ((c === "q" || c === "Q") && next === "'") {
      const prev = sql[i - 1];
      const isPrefix =
        !isIdChar(prev) || ((prev === "n" || prev === "N") && !isIdChar(sql[i - 2]));
      if (isPrefix) {
        const open = sql[i + 2];
        if (open === undefined) throw new Error("Unterminated quoted literal");
        const close = (Q_QUOTE_CLOSERS[open] ?? open) + "'";
        const end = sql.indexOf(close, i + 3);
        if (end === -1) throw new Error("Unterminated quoted literal");
        blank(i + 1, end + 2);
        i = end + 2;
        continue;
      }
    }

    if (c === "'") {
      let j = i + 1;
      for (;;) {
        if (j >= sql.length) throw new Error("Unterminated string literal");
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      blank(i, j + 1);
      i = j + 1;
      continue;
    }

    if (c === '"') {
      const end = sql.indexOf('"', i + 1);
      if (end === -1) throw new Error("Unterminated quoted identifier");
      const inner = sql.slice(i + 1, end);
      out[i] = " ";
      out[end] = " ";
      if (!/^[A-Za-z0-9_$#]*$/.test(inner)) blank(i + 1, end);
      i = end + 1;
      continue;
    }

    i++;
  }
  return out.join("");
}

export function checkReadOnlySql(input: string): GuardResult {
  if (typeof input !== "string" || input.trim() === "") {
    return { ok: false, reason: "SQL is empty" };
  }
  if (input.length > MAX_SQL_LENGTH) {
    return { ok: false, reason: `SQL exceeds ${MAX_SQL_LENGTH} characters` };
  }

  let masked: string;
  try {
    masked = maskSql(input);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }

  // Allow (and drop) a single trailing semicolon; oracledb rejects it anyway.
  let end = masked.length;
  while (end > 0 && /\s/.test(masked[end - 1]!)) end--;
  if (masked[end - 1] === ";") end--;

  const analysed = masked.slice(0, end);
  const sql = input.slice(0, end).trim();

  if (analysed.includes(";")) {
    return { ok: false, reason: "Only a single statement is allowed" };
  }
  if (!/^[\s(]*(SELECT|WITH)(?![A-Za-z0-9_$#])/i.test(analysed)) {
    return { ok: false, reason: "Only SELECT / WITH queries are allowed" };
  }

  const kw = keywordPattern.exec(analysed);
  if (kw) {
    return { ok: false, reason: `Keyword "${kw[1]!.toUpperCase()}" is not allowed in read-only queries` };
  }
  for (const [pattern, reason] of FORBIDDEN_PATTERNS) {
    if (pattern.test(analysed)) return { ok: false, reason };
  }

  return { ok: true, sql };
}
