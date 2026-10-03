-- Least-privilege account used by the MCP server: it can log in, READ the ERP tables
-- and execute the curated report package. Nothing else.
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET DEFINE OFF

ALTER SESSION SET CONTAINER = FREEPDB1;

CREATE USER mcp_reader IDENTIFIED BY "McpReader#2026";
GRANT CREATE SESSION TO mcp_reader;

-- READ (unlike SELECT) does not allow SELECT ... FOR UPDATE row locking.
BEGIN
  FOR t IN (SELECT table_name FROM dba_tables WHERE owner = 'ERP_DEMO') LOOP
    EXECUTE IMMEDIATE 'GRANT READ ON erp_demo.' || DBMS_ASSERT.ENQUOTE_NAME(t.table_name) || ' TO mcp_reader';
  END LOOP;
END;
/

GRANT EXECUTE ON erp_demo.erp_reports TO mcp_reader;

BEGIN
  DBMS_STATS.GATHER_SCHEMA_STATS('ERP_DEMO');
END;
/
