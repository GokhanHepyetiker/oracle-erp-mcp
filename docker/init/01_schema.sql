-- Demo ERP schema for a paper & corrugated packaging manufacturer.
-- Executed by the container as SYS, so we switch to the application PDB first.
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET DEFINE OFF
SET SQLBLANKLINES ON

ALTER SESSION SET CONTAINER = FREEPDB1;

-- Schema-only account: owns the objects but nobody can log in as it.
CREATE USER erp_demo NO AUTHENTICATION
  DEFAULT TABLESPACE users
  QUOTA UNLIMITED ON users;

ALTER SESSION SET CURRENT_SCHEMA = erp_demo;

CREATE TABLE suppliers (
  supplier_id        NUMBER GENERATED ALWAYS AS IDENTITY CONSTRAINT suppliers_pk PRIMARY KEY,
  supplier_code      VARCHAR2(20)  NOT NULL CONSTRAINT suppliers_code_uk UNIQUE,
  name               VARCHAR2(200) NOT NULL,
  supplier_type      VARCHAR2(20)  NOT NULL CONSTRAINT suppliers_type_ck CHECK (supplier_type IN ('DOMESTIC', 'IMPORT')),
  city               VARCHAR2(100),
  country            VARCHAR2(100) NOT NULL,
  payment_term_days  NUMBER(3)     DEFAULT 30 NOT NULL,
  is_active          CHAR(1)       DEFAULT 'Y' NOT NULL CONSTRAINT suppliers_active_ck CHECK (is_active IN ('Y', 'N'))
);

COMMENT ON TABLE  suppliers IS 'Vendors that supply raw materials (waste paper, pulp), chemicals and spare parts.';
COMMENT ON COLUMN suppliers.supplier_code IS 'Business key of the supplier (e.g. SUP-001).';
COMMENT ON COLUMN suppliers.supplier_type IS 'DOMESTIC = Turkish supplier, IMPORT = foreign supplier.';
COMMENT ON COLUMN suppliers.payment_term_days IS 'Agreed payment term in days.';
COMMENT ON COLUMN suppliers.is_active IS 'Y if the supplier can receive new purchase orders.';

CREATE TABLE items (
  item_id        NUMBER GENERATED ALWAYS AS IDENTITY CONSTRAINT items_pk PRIMARY KEY,
  item_code      VARCHAR2(30)  NOT NULL CONSTRAINT items_code_uk UNIQUE,
  name           VARCHAR2(200) NOT NULL,
  category       VARCHAR2(30)  NOT NULL CONSTRAINT items_category_ck
                   CHECK (category IN ('RAW_MATERIAL', 'CHEMICAL', 'SEMI_FINISHED', 'FINISHED_GOOD', 'SPARE_PART')),
  unit           VARCHAR2(10)  NOT NULL CONSTRAINT items_unit_ck CHECK (unit IN ('KG', 'PCS', 'LT')),
  standard_cost  NUMBER(14,4)  NOT NULL
);

COMMENT ON TABLE  items IS 'Item master: raw materials, chemicals, paper grades (semi-finished), corrugated boxes (finished goods) and spare parts.';
COMMENT ON COLUMN items.category IS 'RAW_MATERIAL, CHEMICAL, SEMI_FINISHED (paper reels), FINISHED_GOOD (boxes/sheets) or SPARE_PART.';
COMMENT ON COLUMN items.unit IS 'Stock keeping unit: KG, PCS or LT.';
COMMENT ON COLUMN items.standard_cost IS 'Standard cost per unit in TRY, used for stock valuation.';

CREATE TABLE warehouses (
  warehouse_id    NUMBER GENERATED ALWAYS AS IDENTITY CONSTRAINT warehouses_pk PRIMARY KEY,
  warehouse_code  VARCHAR2(10)  NOT NULL CONSTRAINT warehouses_code_uk UNIQUE,
  name            VARCHAR2(100) NOT NULL,
  city            VARCHAR2(100) NOT NULL
);

COMMENT ON TABLE warehouses IS 'Physical storage locations (raw material yard, reel store, finished goods, spare parts).';

CREATE TABLE purchase_orders (
  po_id        NUMBER GENERATED ALWAYS AS IDENTITY CONSTRAINT purchase_orders_pk PRIMARY KEY,
  po_number    VARCHAR2(20) NOT NULL CONSTRAINT purchase_orders_no_uk UNIQUE,
  supplier_id  NUMBER       NOT NULL CONSTRAINT purchase_orders_supplier_fk REFERENCES suppliers,
  order_date   DATE         NOT NULL,
  status       VARCHAR2(20) NOT NULL CONSTRAINT purchase_orders_status_ck
                 CHECK (status IN ('DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
  currency     VARCHAR2(3)  NOT NULL CONSTRAINT purchase_orders_currency_ck CHECK (currency IN ('TRY', 'USD', 'EUR')),
  buyer_name   VARCHAR2(100) NOT NULL
);

CREATE INDEX purchase_orders_supplier_ix ON purchase_orders (supplier_id);
CREATE INDEX purchase_orders_date_ix ON purchase_orders (order_date);

COMMENT ON TABLE  purchase_orders IS 'Purchase order headers.';
COMMENT ON COLUMN purchase_orders.status IS 'DRAFT, APPROVED, PARTIALLY_RECEIVED, RECEIVED or CANCELLED.';
COMMENT ON COLUMN purchase_orders.currency IS 'Order currency. Amounts on lines are in this currency.';
COMMENT ON COLUMN purchase_orders.buyer_name IS 'Purchasing specialist responsible for the order.';

CREATE TABLE purchase_order_lines (
  po_line_id    NUMBER GENERATED ALWAYS AS IDENTITY CONSTRAINT po_lines_pk PRIMARY KEY,
  po_id         NUMBER       NOT NULL CONSTRAINT po_lines_po_fk REFERENCES purchase_orders,
  line_no       NUMBER(4)    NOT NULL,
  item_id       NUMBER       NOT NULL CONSTRAINT po_lines_item_fk REFERENCES items,
  quantity      NUMBER(14,3) NOT NULL,
  unit_price    NUMBER(14,4) NOT NULL,
  discount_pct  NUMBER(5,2)  DEFAULT 0 NOT NULL,
  received_qty  NUMBER(14,3) DEFAULT 0 NOT NULL,
  net_amount    NUMBER GENERATED ALWAYS AS (ROUND(quantity * unit_price * (1 - discount_pct / 100), 2)) VIRTUAL,
  CONSTRAINT po_lines_uk UNIQUE (po_id, line_no)
);

CREATE INDEX po_lines_item_ix ON purchase_order_lines (item_id);

COMMENT ON TABLE  purchase_order_lines IS 'Purchase order lines (one item per line).';
COMMENT ON COLUMN purchase_order_lines.discount_pct IS 'Discount negotiated by the buyer, in percent.';
COMMENT ON COLUMN purchase_order_lines.received_qty IS 'Quantity received into stock so far.';
COMMENT ON COLUMN purchase_order_lines.net_amount IS 'quantity * unit_price after discount, in the order currency.';

CREATE TABLE weighbridge_tickets (
  ticket_id          NUMBER GENERATED ALWAYS AS IDENTITY CONSTRAINT weighbridge_pk PRIMARY KEY,
  ticket_no          VARCHAR2(20) NOT NULL CONSTRAINT weighbridge_no_uk UNIQUE,
  ticket_date        DATE         NOT NULL,
  supplier_id        NUMBER       NOT NULL CONSTRAINT weighbridge_supplier_fk REFERENCES suppliers,
  item_id            NUMBER       NOT NULL CONSTRAINT weighbridge_item_fk REFERENCES items,
  vehicle_plate      VARCHAR2(15) NOT NULL,
  gross_kg           NUMBER(8)    NOT NULL,
  tare_kg            NUMBER(8)    NOT NULL,
  moisture_pct       NUMBER(5,2)  NOT NULL,
  contamination_pct  NUMBER(5,2)  NOT NULL,
  net_kg             NUMBER GENERATED ALWAYS AS (gross_kg - tare_kg) VIRTUAL,
  payable_kg         NUMBER GENERATED ALWAYS AS (
                       ROUND((gross_kg - tare_kg) * (1 - GREATEST(moisture_pct - 12, 0) / 100 - contamination_pct / 100))
                     ) VIRTUAL
);

CREATE INDEX weighbridge_supplier_ix ON weighbridge_tickets (supplier_id);
CREATE INDEX weighbridge_date_ix ON weighbridge_tickets (ticket_date);

COMMENT ON TABLE  weighbridge_tickets IS 'Truck scale (kantar) tickets for incoming waste paper deliveries, incl. moisture and contamination measurements.';
COMMENT ON COLUMN weighbridge_tickets.net_kg IS 'Net delivered weight = gross_kg - tare_kg.';
COMMENT ON COLUMN weighbridge_tickets.moisture_pct IS 'Measured moisture. Anything above 12% is deducted from the payable weight.';
COMMENT ON COLUMN weighbridge_tickets.contamination_pct IS 'Non-paper contamination (plastic, metal, sand), fully deducted from the payable weight.';
COMMENT ON COLUMN weighbridge_tickets.payable_kg IS 'Weight invoiced by the supplier after moisture and contamination deductions.';

CREATE TABLE work_orders (
  work_order_id   NUMBER GENERATED ALWAYS AS IDENTITY CONSTRAINT work_orders_pk PRIMARY KEY,
  work_order_no   VARCHAR2(20) NOT NULL CONSTRAINT work_orders_no_uk UNIQUE,
  item_id         NUMBER       NOT NULL CONSTRAINT work_orders_item_fk REFERENCES items,
  machine_code    VARCHAR2(10) NOT NULL CONSTRAINT work_orders_machine_ck CHECK (machine_code IN ('PM1', 'PM2', 'CORR1', 'CORR2')),
  planned_qty     NUMBER(14,3) NOT NULL,
  produced_qty    NUMBER(14,3) DEFAULT 0 NOT NULL,
  scrap_qty       NUMBER(14,3) DEFAULT 0 NOT NULL,
  planned_start   DATE         NOT NULL,
  planned_end     DATE         NOT NULL,
  actual_end      DATE,
  status          VARCHAR2(20) NOT NULL CONSTRAINT work_orders_status_ck
                    CHECK (status IN ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'))
);

CREATE INDEX work_orders_item_ix ON work_orders (item_id);

COMMENT ON TABLE  work_orders IS 'Production work orders. PM1/PM2 are paper machines producing reels (KG); CORR1/CORR2 are corrugators producing boxes/sheets (PCS).';
COMMENT ON COLUMN work_orders.produced_qty IS 'Good quantity produced.';
COMMENT ON COLUMN work_orders.scrap_qty IS 'Quantity scrapped (fire) during production, same unit as the item.';
COMMENT ON COLUMN work_orders.actual_end IS 'Completion date; NULL while the order is open.';

CREATE TABLE stock_movements (
  movement_id    NUMBER GENERATED ALWAYS AS IDENTITY CONSTRAINT stock_movements_pk PRIMARY KEY,
  movement_date  DATE         NOT NULL,
  item_id        NUMBER       NOT NULL CONSTRAINT stock_movements_item_fk REFERENCES items,
  warehouse_id   NUMBER       NOT NULL CONSTRAINT stock_movements_wh_fk REFERENCES warehouses,
  movement_type  VARCHAR2(20) NOT NULL CONSTRAINT stock_movements_type_ck
                   CHECK (movement_type IN ('PURCHASE_RECEIPT', 'PRODUCTION_ISSUE', 'PRODUCTION_RECEIPT', 'SALES_SHIPMENT', 'ADJUSTMENT')),
  quantity       NUMBER(14,3) NOT NULL,
  reference_no   VARCHAR2(30)
);

CREATE INDEX stock_movements_item_ix ON stock_movements (item_id, warehouse_id);
CREATE INDEX stock_movements_date_ix ON stock_movements (movement_date);

COMMENT ON TABLE  stock_movements IS 'Inventory transactions. Stock balance = SUM(quantity) per item and warehouse.';
COMMENT ON COLUMN stock_movements.quantity IS 'Signed quantity: positive = into stock, negative = out of stock.';
COMMENT ON COLUMN stock_movements.reference_no IS 'Source document number (PO number, work order number, shipment number).';
