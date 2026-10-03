-- Curated report package. Each procedure returns its result set through a SYS_REFCURSOR
-- OUT parameter (always the last argument) so it can be exposed by the MCP server.
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET DEFINE OFF
SET SQLBLANKLINES ON

ALTER SESSION SET CONTAINER = FREEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = erp_demo;

CREATE OR REPLACE PACKAGE erp_reports AUTHID DEFINER AS
  PROCEDURE supplier_performance (p_date_from IN DATE, p_date_to IN DATE, p_result OUT SYS_REFCURSOR);
  PROCEDURE waste_paper_quality  (p_date_from IN DATE, p_date_to IN DATE, p_result OUT SYS_REFCURSOR);
  PROCEDURE stock_balance        (p_warehouse_code IN VARCHAR2, p_category IN VARCHAR2, p_result OUT SYS_REFCURSOR);
  PROCEDURE production_scrap     (p_date_from IN DATE, p_date_to IN DATE, p_result OUT SYS_REFCURSOR);
  PROCEDURE monthly_purchases    (p_year IN NUMBER, p_result OUT SYS_REFCURSOR);
END erp_reports;
/

CREATE OR REPLACE PACKAGE BODY erp_reports AS

  PROCEDURE supplier_performance (p_date_from IN DATE, p_date_to IN DATE, p_result OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_result FOR
      SELECT s.supplier_code,
             s.name                                                      AS supplier_name,
             s.supplier_type,
             po.currency,
             COUNT(DISTINCT po.po_id)                                    AS po_count,
             ROUND(SUM(l.net_amount), 2)                                 AS net_amount,
             ROUND(AVG(l.discount_pct), 2)                               AS avg_discount_pct,
             ROUND(100 * SUM(l.received_qty) / NULLIF(SUM(l.quantity), 0), 1) AS fulfilment_pct
        FROM purchase_orders po
        JOIN suppliers s            ON s.supplier_id = po.supplier_id
        JOIN purchase_order_lines l ON l.po_id = po.po_id
       WHERE po.status <> 'CANCELLED'
         AND (p_date_from IS NULL OR po.order_date >= p_date_from)
         AND (p_date_to   IS NULL OR po.order_date <  p_date_to + 1)
       GROUP BY s.supplier_code, s.name, s.supplier_type, po.currency
       ORDER BY po.currency, net_amount DESC;
  END supplier_performance;

  PROCEDURE waste_paper_quality (p_date_from IN DATE, p_date_to IN DATE, p_result OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_result FOR
      SELECT s.supplier_code,
             s.name                                                          AS supplier_name,
             COUNT(*)                                                        AS ticket_count,
             SUM(w.net_kg)                                                   AS net_kg,
             SUM(w.payable_kg)                                               AS payable_kg,
             ROUND(100 * (1 - SUM(w.payable_kg) / NULLIF(SUM(w.net_kg), 0)), 2) AS deduction_pct,
             ROUND(AVG(w.moisture_pct), 2)                                   AS avg_moisture_pct,
             ROUND(AVG(w.contamination_pct), 2)                              AS avg_contamination_pct,
             SUM(CASE WHEN w.moisture_pct > 15 THEN 1 ELSE 0 END)            AS high_moisture_tickets
        FROM weighbridge_tickets w
        JOIN suppliers s ON s.supplier_id = w.supplier_id
       WHERE (p_date_from IS NULL OR w.ticket_date >= p_date_from)
         AND (p_date_to   IS NULL OR w.ticket_date <  p_date_to + 1)
       GROUP BY s.supplier_code, s.name
       ORDER BY deduction_pct DESC;
  END waste_paper_quality;

  PROCEDURE stock_balance (p_warehouse_code IN VARCHAR2, p_category IN VARCHAR2, p_result OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_result FOR
      SELECT wh.warehouse_code,
             i.item_code,
             i.name                                         AS item_name,
             i.category,
             i.unit,
             SUM(m.quantity)                                AS balance_qty,
             ROUND(SUM(m.quantity) * i.standard_cost, 2)    AS stock_value_try,
             MAX(m.movement_date)                           AS last_movement_date
        FROM stock_movements m
        JOIN items i       ON i.item_id = m.item_id
        JOIN warehouses wh ON wh.warehouse_id = m.warehouse_id
       WHERE (p_warehouse_code IS NULL OR wh.warehouse_code = UPPER(p_warehouse_code))
         AND (p_category       IS NULL OR i.category        = UPPER(p_category))
       GROUP BY wh.warehouse_code, i.item_code, i.name, i.category, i.unit, i.standard_cost
      HAVING SUM(m.quantity) <> 0
       ORDER BY wh.warehouse_code, stock_value_try DESC;
  END stock_balance;

  PROCEDURE production_scrap (p_date_from IN DATE, p_date_to IN DATE, p_result OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_result FOR
      SELECT w.machine_code,
             i.item_code,
             i.name                                                                     AS item_name,
             i.unit,
             COUNT(*)                                                                   AS work_orders,
             SUM(w.planned_qty)                                                         AS planned_qty,
             SUM(w.produced_qty)                                                        AS produced_qty,
             SUM(w.scrap_qty)                                                           AS scrap_qty,
             ROUND(100 * SUM(w.scrap_qty) / NULLIF(SUM(w.produced_qty + w.scrap_qty), 0), 2) AS scrap_rate_pct,
             ROUND(100 * SUM(w.produced_qty) / NULLIF(SUM(w.planned_qty), 0), 1)        AS plan_attainment_pct
        FROM work_orders w
        JOIN items i ON i.item_id = w.item_id
       WHERE w.status IN ('COMPLETED', 'CLOSED')
         AND (p_date_from IS NULL OR w.actual_end >= p_date_from)
         AND (p_date_to   IS NULL OR w.actual_end <  p_date_to + 1)
       GROUP BY w.machine_code, i.item_code, i.name, i.unit
       ORDER BY w.machine_code, scrap_rate_pct DESC;
  END production_scrap;

  PROCEDURE monthly_purchases (p_year IN NUMBER, p_result OUT SYS_REFCURSOR) IS
  BEGIN
    OPEN p_result FOR
      SELECT TO_CHAR(TRUNC(po.order_date, 'MM'), 'YYYY-MM') AS order_month,
             po.currency,
             COUNT(DISTINCT po.po_id)                       AS po_count,
             ROUND(SUM(l.net_amount), 2)                    AS net_amount
        FROM purchase_orders po
        JOIN purchase_order_lines l ON l.po_id = po.po_id
       WHERE po.status <> 'CANCELLED'
         AND (p_year IS NULL OR EXTRACT(YEAR FROM po.order_date) = p_year)
       GROUP BY TRUNC(po.order_date, 'MM'), po.currency
       ORDER BY TRUNC(po.order_date, 'MM'), po.currency;
  END monthly_purchases;

END erp_reports;
/

-- SQL*Plus only warns on compilation errors, so fail the init explicitly.
DECLARE
  v_errors NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_errors FROM dba_errors WHERE owner = 'ERP_DEMO';
  IF v_errors > 0 THEN
    RAISE_APPLICATION_ERROR(-20001, 'ERP_DEMO has ' || v_errors || ' compilation error(s)');
  END IF;
END;
/
