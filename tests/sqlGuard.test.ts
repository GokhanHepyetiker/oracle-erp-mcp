import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkReadOnlySql, maskSql } from "../src/sqlGuard.js";

const accept = (sql: string) => {
  const r = checkReadOnlySql(sql);
  assert.equal(r.ok, true, `expected accepted: ${sql}\n${r.ok ? "" : r.reason}`);
  return r.ok ? r.sql : "";
};

const reject = (sql: string, reason?: RegExp) => {
  const r = checkReadOnlySql(sql);
  assert.equal(r.ok, false, `expected rejected: ${sql}`);
  if (reason && !r.ok) assert.match(r.reason, reason);
};

describe("checkReadOnlySql - accepted", () => {
  it("accepts simple SELECT", () => accept("SELECT * FROM erp_demo.items"));
  it("accepts lowercase and leading whitespace", () => accept("  \n select 1 from dual"));
  it("accepts WITH / CTE", () =>
    accept("WITH t AS (SELECT item_id FROM erp_demo.items) SELECT COUNT(*) FROM t"));
  it("accepts parenthesised query", () => accept("(SELECT 1 FROM dual) UNION ALL (SELECT 2 FROM dual)"));
  it("accepts Oracle row limiting clause", () =>
    accept("SELECT * FROM erp_demo.suppliers ORDER BY name FETCH FIRST 10 ROWS ONLY"));

  it("strips a single trailing semicolon", () => {
    assert.equal(accept("SELECT 1 FROM dual;  \n"), "SELECT 1 FROM dual");
  });

  it("ignores forbidden words inside string literals", () =>
    accept("SELECT * FROM erp_demo.purchase_orders WHERE status = 'DELETE; DROP TABLE x'"));
  it("handles escaped quotes in literals", () => accept("SELECT 'it''s; UPDATE' AS s FROM dual"));
  it("ignores forbidden words inside q-quoted literals", () =>
    accept("SELECT q'[it's an UPDATE; really]' FROM dual"));
  it("ignores forbidden words inside comments", () =>
    accept("SELECT 1 -- DELETE everything; \nFROM dual /* DROP TABLE x; */"));
  it("does not flag identifiers that merely contain keywords", () =>
    accept("SELECT last_update_date, created_by, begin_date FROM erp_demo.x"));
  it("allows Oracle identifiers with $ and #", () => accept("SELECT col$1, col#2 FROM erp_demo.t"));
  it("allows SYS_ functions that are not packages", () => accept("SELECT SYS_GUID(), SYSDATE FROM dual"));
});

describe("checkReadOnlySql - rejected", () => {
  it("rejects empty input", () => reject("   ", /empty/));
  it("rejects DML", () => {
    reject("INSERT INTO t VALUES (1)", /SELECT/);
    reject("UPDATE t SET a = 1", /SELECT/);
    reject("DELETE FROM t", /SELECT/);
    reject("MERGE INTO t USING s ON (1=1) WHEN MATCHED THEN UPDATE SET a = 1", /SELECT/);
  });
  it("rejects DDL", () => {
    reject("DROP TABLE t");
    reject("TRUNCATE TABLE t");
    reject("CREATE TABLE t (a NUMBER)");
    reject("ALTER SESSION SET nls_date_format = 'YYYY'");
  });
  it("rejects PL/SQL blocks", () => {
    reject("BEGIN NULL; END;");
    reject("DECLARE x NUMBER; BEGIN NULL; END;");
  });
  it("rejects multiple statements", () =>
    reject("SELECT 1 FROM dual; DELETE FROM t", /single statement/));
  it("rejects data-changing CTE tricks", () =>
    reject("WITH x AS (SELECT 1 FROM dual) DELETE FROM t", /DELETE/));
  it("rejects SELECT ... FOR UPDATE row locking", () =>
    reject("SELECT * FROM t FOR UPDATE", /UPDATE/));
  it("rejects inline PL/SQL functions in WITH", () =>
    reject("WITH FUNCTION f RETURN NUMBER IS BEGIN RETURN 1; END; SELECT f FROM dual"));
  it("rejects DBMS_ and UTL_ packages", () => {
    reject("SELECT DBMS_RANDOM.VALUE FROM dual", /DBMS_/);
    reject("SELECT sys.dbms_lock.sleep(5) FROM dual", /DBMS_/);
    reject("SELECT UTL_HTTP.REQUEST('http://evil') FROM dual", /UTL_/);
    reject("SELECT HTTPURITYPE('http://evil').getclob() FROM dual", /URI/);
  });
  it("rejects packages hidden in quoted identifiers", () =>
    reject('SELECT "DBMS_RANDOM"."VALUE" FROM dual', /DBMS_/));
  it("rejects database links", () => reject("SELECT * FROM t@remote_db", /link/i));
  it("rejects keywords smuggled after a comment", () =>
    reject("SELECT 1 FROM dual /* harmless */ ; DROP TABLE t"));
  it("rejects unterminated literals and comments", () => {
    reject("SELECT 'abc FROM dual", /Unterminated/);
    reject("SELECT 1 FROM dual /* never closed", /Unterminated/);
    reject("SELECT q'[abc FROM dual", /Unterminated/);
  });
  it("rejects overly long SQL", () => reject(`SELECT ${"1,".repeat(15_000)}1 FROM dual`, /exceeds/));
});

describe("maskSql", () => {
  it("preserves length and newlines", () => {
    const sql = "SELECT 'x' -- c\nFROM /* y */ dual";
    const masked = maskSql(sql);
    assert.equal(masked.length, sql.length);
    assert.equal(masked.split("\n").length, 2);
    assert.doesNotMatch(masked, /'x'|-- c|\/\* y \*\//);
  });
});
