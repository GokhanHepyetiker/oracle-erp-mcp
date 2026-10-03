-- Deterministic demo data (DBMS_RANDOM is seeded) covering 2025-01-01 .. 2026-09-30.
WHENEVER SQLERROR EXIT SQL.SQLCODE
SET DEFINE OFF
SET SQLBLANKLINES ON

ALTER SESSION SET CONTAINER = FREEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = erp_demo;

INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-001', 'Anadolu Geri Donusum Ltd.',      'DOMESTIC', 'Kahramanmaras', 'Turkey',         30, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-002', 'Ege Atik Kagit A.S.',            'DOMESTIC', 'Izmir',         'Turkey',         45, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-003', 'Marmara Recycling Co.',          'DOMESTIC', 'Kocaeli',       'Turkey',         30, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-004', 'Cukurova Kagit Toplama',         'DOMESTIC', 'Adana',         'Turkey',         15, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-005', 'Gaziantep Hurda Kagit',          'DOMESTIC', 'Gaziantep',     'Turkey',         30, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-006', 'Konya Ambalaj Atiklari',         'DOMESTIC', 'Konya',         'Turkey',         60, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-007', 'Baskent Kimya San.',             'DOMESTIC', 'Ankara',        'Turkey',         60, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-008', 'Bursa Endustriyel Yedek Parca',  'DOMESTIC', 'Bursa',         'Turkey',         90, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-009', 'Nordic Kraft Oy',                'IMPORT',   'Kotka',         'Finland',        60, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-010', 'Rhein Papier Recycling GmbH',    'IMPORT',   'Duisburg',      'Germany',        45, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-011', 'Lombardia Chemicals S.p.A.',     'IMPORT',   'Milan',         'Italy',          60, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-012', 'Atlantic Fibre Exports LLC',     'IMPORT',   'Savannah',      'USA',            30, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-013', 'Thames Waste Paper Ltd.',        'IMPORT',   'London',        'United Kingdom', 45, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-014', 'Iskenderun Liman Lojistik',      'DOMESTIC', 'Hatay',         'Turkey',         30, 'Y');
INSERT INTO suppliers (supplier_code, name, supplier_type, city, country, payment_term_days, is_active) VALUES ('SUP-015', 'Malatya Karton Toplama',         'DOMESTIC', 'Malatya',       'Turkey',         30, 'N');

INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('RM-OCC-95',  'OCC 95/5 Waste Corrugated',          'RAW_MATERIAL',  'KG',  6.20);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('RM-MIX-01',  'Mixed Waste Paper',                  'RAW_MATERIAL',  'KG',  4.10);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('RM-OCC-IMP', 'Imported OCC (ISRI 11/12)',          'RAW_MATERIAL',  'KG',  7.40);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('RM-KRAFT-P', 'Unbleached Kraft Pulp',              'RAW_MATERIAL',  'KG',  24.50);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('CH-STARCH',  'Cationic Starch',                    'CHEMICAL',      'KG',  28.00);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('CH-AKD',     'AKD Sizing Agent',                   'CHEMICAL',      'KG',  55.00);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('CH-RET',     'Retention Aid Polymer',              'CHEMICAL',      'KG',  92.00);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('CH-NAOH',    'Caustic Soda 50%',                   'CHEMICAL',      'LT',  14.00);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('SF-TL120',   'Testliner 120 g/m2 Reel',            'SEMI_FINISHED', 'KG',  19.50);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('SF-TL140',   'Testliner 140 g/m2 Reel',            'SEMI_FINISHED', 'KG',  19.80);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('SF-FL112',   'Fluting 112 g/m2 Reel',              'SEMI_FINISHED', 'KG',  18.20);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('SF-FL127',   'Fluting 127 g/m2 Reel',              'SEMI_FINISHED', 'KG',  18.40);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('SF-KL150',   'Kraftliner 150 g/m2 Reel',           'SEMI_FINISHED', 'KG',  26.00);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('FG-BOX-B30', 'Corrugated Box B-Flute 30x20x15',    'FINISHED_GOOD', 'PCS', 9.80);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('FG-BOX-C40', 'Corrugated Box C-Flute 40x30x30',    'FINISHED_GOOD', 'PCS', 16.40);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('FG-SHT-BC',  'Corrugated Sheet BC-Flute 120x80',   'FINISHED_GOOD', 'PCS', 21.00);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('FG-TRY-E',   'Fruit Tray E-Flute 60x40',           'FINISHED_GOOD', 'PCS', 7.30);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('SP-FELT-1',  'Press Felt PM1',                     'SPARE_PART',    'PCS', 185000);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('SP-BLADE',   'Creping Doctor Blade',               'SPARE_PART',    'PCS', 3200);
INSERT INTO items (item_code, name, category, unit, standard_cost) VALUES ('SP-BRG-223', 'Spherical Roller Bearing 22320',     'SPARE_PART',    'PCS', 14500);

INSERT INTO warehouses (warehouse_code, name, city) VALUES ('W01', 'Raw Material Yard',          'Kahramanmaras');
INSERT INTO warehouses (warehouse_code, name, city) VALUES ('W02', 'Reel Store',                 'Kahramanmaras');
INSERT INTO warehouses (warehouse_code, name, city) VALUES ('W03', 'Finished Goods',             'Kahramanmaras');
INSERT INTO warehouses (warehouse_code, name, city) VALUES ('W04', 'Chemicals & Spare Parts',    'Kahramanmaras');
INSERT INTO warehouses (warehouse_code, name, city) VALUES ('W05', 'Finished Goods - Ankara Hub', 'Ankara');

DECLARE
  TYPE t_num IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
  TYPE t_str IS TABLE OF VARCHAR2(100) INDEX BY PLS_INTEGER;

  c_from CONSTANT DATE := DATE '2025-01-01';
  c_to   CONSTANT DATE := DATE '2026-09-30';
  c_span CONSTANT NUMBER := DATE '2026-09-30' - DATE '2025-01-01';

  sup_dom_waste  t_num;
  sup_dom_codes  t_str;
  sup_imp_waste  t_num;
  sup_pulp       t_num;
  sup_chem       t_num;
  sup_spare      t_num;

  it_dom_waste   t_num;
  it_imp_waste   t_num;
  it_pulp        t_num;
  it_chem        t_num;
  it_spare       t_num;
  it_sf          t_num;
  it_fg          t_num;
  it_liner       t_num;
  it_fluting     t_num;
  buyers         t_str;

  w_raw NUMBER; w_reel NUMBER; w_fg NUMBER; w_store NUMBER; w_ankara NUMBER;
  i_occ95 NUMBER; i_mix NUMBER; i_occ_imp NUMBER; i_kraft_pulp NUMBER; i_starch NUMBER; i_kl150 NUMBER;

  v_date DATE; v_end DATE; v_actual_end DATE; v_mdate DATE;
  v_r NUMBER; v_kind VARCHAR2(10); v_sup NUMBER; v_idx PLS_INTEGER;
  v_stype VARCHAR2(20); v_country VARCHAR2(100); v_currency VARCHAR2(3); v_fx NUMBER;
  v_status VARCHAR2(20); v_buyer PLS_INTEGER; v_doc VARCHAR2(30); v_po NUMBER;
  v_lines PLS_INTEGER; v_item NUMBER; v_qty NUMBER; v_price NUMBER; v_disc NUMBER; v_recv NUMBER;
  v_gross NUMBER; v_tare NUMBER; v_moist NUMBER; v_contam NUMBER; v_payable NUMBER;
  v_machine VARCHAR2(10); v_planned NUMBER; v_produced NUMBER; v_scrap NUMBER; v_scrap_rate NUMBER;
  v_is_pm BOOLEAN; v_wh NUMBER; v_kg NUMBER; v_ship_seq PLS_INTEGER := 0; v_ship_n PLS_INTEGER; v_ship_pct NUMBER;

  FUNCTION pick(p t_num) RETURN NUMBER IS
  BEGIN
    RETURN p(TRUNC(DBMS_RANDOM.VALUE(1, p.COUNT + 1)));
  END;

  FUNCTION item_id_of(p_code VARCHAR2) RETURN NUMBER IS
    v NUMBER;
  BEGIN
    SELECT item_id INTO v FROM items WHERE item_code = p_code;
    RETURN v;
  END;

  FUNCTION wh_id_of(p_code VARCHAR2) RETURN NUMBER IS
    v NUMBER;
  BEGIN
    SELECT warehouse_id INTO v FROM warehouses WHERE warehouse_code = p_code;
    RETURN v;
  END;

  FUNCTION item_cost(p_item NUMBER) RETURN NUMBER IS
    v NUMBER;
  BEGIN
    SELECT standard_cost INTO v FROM items WHERE item_id = p_item;
    RETURN v;
  END;

  PROCEDURE add_move(p_date DATE, p_item NUMBER, p_wh NUMBER, p_type VARCHAR2, p_qty NUMBER, p_ref VARCHAR2) IS
  BEGIN
    IF p_qty <> 0 THEN
      INSERT INTO stock_movements (movement_date, item_id, warehouse_id, movement_type, quantity, reference_no)
      VALUES (p_date, p_item, p_wh, p_type, p_qty, p_ref);
    END IF;
  END;
BEGIN
  DBMS_RANDOM.SEED(2026);

  SELECT supplier_id, supplier_code BULK COLLECT INTO sup_dom_waste, sup_dom_codes
    FROM suppliers WHERE supplier_code IN ('SUP-001','SUP-002','SUP-003','SUP-004','SUP-005','SUP-006','SUP-014')
   ORDER BY supplier_id;
  SELECT supplier_id BULK COLLECT INTO sup_imp_waste FROM suppliers WHERE supplier_code IN ('SUP-010','SUP-012','SUP-013') ORDER BY supplier_id;
  SELECT supplier_id BULK COLLECT INTO sup_pulp      FROM suppliers WHERE supplier_code IN ('SUP-009') ORDER BY supplier_id;
  SELECT supplier_id BULK COLLECT INTO sup_chem      FROM suppliers WHERE supplier_code IN ('SUP-007','SUP-011') ORDER BY supplier_id;
  SELECT supplier_id BULK COLLECT INTO sup_spare     FROM suppliers WHERE supplier_code IN ('SUP-008') ORDER BY supplier_id;

  SELECT item_id BULK COLLECT INTO it_dom_waste FROM items WHERE item_code IN ('RM-OCC-95','RM-MIX-01') ORDER BY item_id;
  SELECT item_id BULK COLLECT INTO it_imp_waste FROM items WHERE item_code IN ('RM-OCC-IMP') ORDER BY item_id;
  SELECT item_id BULK COLLECT INTO it_pulp      FROM items WHERE item_code IN ('RM-KRAFT-P') ORDER BY item_id;
  SELECT item_id BULK COLLECT INTO it_chem      FROM items WHERE category = 'CHEMICAL' ORDER BY item_id;
  SELECT item_id BULK COLLECT INTO it_spare     FROM items WHERE category = 'SPARE_PART' ORDER BY item_id;
  SELECT item_id BULK COLLECT INTO it_sf        FROM items WHERE category = 'SEMI_FINISHED' ORDER BY item_id;
  SELECT item_id BULK COLLECT INTO it_fg        FROM items WHERE category = 'FINISHED_GOOD' ORDER BY item_id;
  SELECT item_id BULK COLLECT INTO it_liner     FROM items WHERE item_code IN ('SF-TL120','SF-TL140','SF-KL150') ORDER BY item_id;
  SELECT item_id BULK COLLECT INTO it_fluting   FROM items WHERE item_code IN ('SF-FL112','SF-FL127') ORDER BY item_id;

  buyers(1) := 'Ayse Kaya';
  buyers(2) := 'Mehmet Demir';
  buyers(3) := 'Elif Sahin';
  buyers(4) := 'Can Yildiz';

  w_raw := wh_id_of('W01'); w_reel := wh_id_of('W02'); w_fg := wh_id_of('W03');
  w_store := wh_id_of('W04'); w_ankara := wh_id_of('W05');
  i_occ95 := item_id_of('RM-OCC-95'); i_mix := item_id_of('RM-MIX-01'); i_occ_imp := item_id_of('RM-OCC-IMP');
  i_kraft_pulp := item_id_of('RM-KRAFT-P'); i_starch := item_id_of('CH-STARCH'); i_kl150 := item_id_of('SF-KL150');

  -- Opening balances
  FOR r IN (SELECT item_id, category FROM items ORDER BY item_id) LOOP
    add_move(c_from, r.item_id,
             CASE r.category WHEN 'RAW_MATERIAL' THEN w_raw WHEN 'SEMI_FINISHED' THEN w_reel
                             WHEN 'FINISHED_GOOD' THEN w_fg ELSE w_store END,
             'ADJUSTMENT',
             CASE r.category WHEN 'RAW_MATERIAL' THEN 400000 WHEN 'SEMI_FINISHED' THEN 150000
                             WHEN 'FINISHED_GOOD' THEN 20000 WHEN 'CHEMICAL' THEN 8000 ELSE 4 END,
             'OPENING-2025');
  END LOOP;

  -- Purchase orders
  FOR i IN 1 .. 420 LOOP
    v_date := c_from + TRUNC((i - 1) * c_span / 420 + DBMS_RANDOM.VALUE(0, 1));
    v_r := DBMS_RANDOM.VALUE;
    IF v_r < 0.42 THEN v_kind := 'DW'; v_sup := pick(sup_dom_waste);
    ELSIF v_r < 0.60 THEN v_kind := 'IW'; v_sup := pick(sup_imp_waste);
    ELSIF v_r < 0.70 THEN v_kind := 'PULP'; v_sup := pick(sup_pulp);
    ELSIF v_r < 0.88 THEN v_kind := 'CHEM'; v_sup := pick(sup_chem);
    ELSE v_kind := 'SPARE'; v_sup := pick(sup_spare);
    END IF;

    SELECT supplier_type, country INTO v_stype, v_country FROM suppliers WHERE supplier_id = v_sup;
    v_currency := CASE WHEN v_stype = 'DOMESTIC' THEN 'TRY'
                       WHEN v_country IN ('USA', 'United Kingdom') THEN 'USD' ELSE 'EUR' END;
    v_fx := CASE v_currency WHEN 'TRY' THEN 1 WHEN 'USD' THEN 40 ELSE 44 END;

    v_r := DBMS_RANDOM.VALUE;
    v_status := CASE
                  WHEN v_r < 0.04 THEN 'CANCELLED'
                  WHEN c_to - v_date > 45 THEN 'RECEIVED'
                  WHEN c_to - v_date > 15 THEN CASE WHEN v_r < 0.5 THEN 'PARTIALLY_RECEIVED' ELSE 'RECEIVED' END
                  WHEN c_to - v_date > 4 THEN 'APPROVED'
                  ELSE 'DRAFT'
                END;
    v_buyer := TRUNC(DBMS_RANDOM.VALUE(1, 5));
    v_doc := 'PO-' || TO_CHAR(v_date, 'YYYY') || '-' || LPAD(i, 5, '0');

    INSERT INTO purchase_orders (po_number, supplier_id, order_date, status, currency, buyer_name)
    VALUES (v_doc, v_sup, v_date, v_status, v_currency, buyers(v_buyer))
    RETURNING po_id INTO v_po;

    v_lines := CASE v_kind WHEN 'CHEM' THEN TRUNC(DBMS_RANDOM.VALUE(1, 4))
                           WHEN 'SPARE' THEN TRUNC(DBMS_RANDOM.VALUE(1, 4))
                           WHEN 'DW' THEN TRUNC(DBMS_RANDOM.VALUE(1, 3))
                           ELSE 1 END;
    FOR l IN 1 .. v_lines LOOP
      v_item := CASE v_kind WHEN 'DW' THEN pick(it_dom_waste) WHEN 'IW' THEN pick(it_imp_waste)
                            WHEN 'PULP' THEN pick(it_pulp) WHEN 'CHEM' THEN pick(it_chem)
                            ELSE pick(it_spare) END;
      v_qty := CASE v_kind WHEN 'DW' THEN ROUND(DBMS_RANDOM.VALUE(20000, 120000), -2)
                           WHEN 'IW' THEN ROUND(DBMS_RANDOM.VALUE(100000, 400000), -3)
                           WHEN 'PULP' THEN ROUND(DBMS_RANDOM.VALUE(50000, 200000), -3)
                           WHEN 'CHEM' THEN ROUND(DBMS_RANDOM.VALUE(500, 6000), -1)
                           ELSE TRUNC(DBMS_RANDOM.VALUE(1, 7)) END;
      -- TRY prices follow ~2% monthly inflation; FX prices are roughly stable
      v_price := ROUND(item_cost(v_item)
                       * CASE WHEN v_fx = 1 THEN 0.75 + 0.02 * MONTHS_BETWEEN(v_date, c_from) ELSE 1 END
                       * DBMS_RANDOM.VALUE(0.92, 1.10) / v_fx, 4);
      -- each buyer negotiates differently (useful for discount performance analysis)
      v_disc := ROUND(CASE v_buyer WHEN 1 THEN DBMS_RANDOM.VALUE(1, 3)
                                   WHEN 2 THEN DBMS_RANDOM.VALUE(0, 2)
                                   WHEN 3 THEN DBMS_RANDOM.VALUE(3, 6.5)
                                   ELSE DBMS_RANDOM.VALUE(0, 4) END, 2);
      v_recv := CASE v_status
                  WHEN 'RECEIVED' THEN CASE WHEN v_kind = 'SPARE' THEN v_qty ELSE ROUND(v_qty * DBMS_RANDOM.VALUE(0.97, 1.0)) END
                  WHEN 'PARTIALLY_RECEIVED' THEN ROUND(v_qty * DBMS_RANDOM.VALUE(0.3, 0.8))
                  ELSE 0 END;

      INSERT INTO purchase_order_lines (po_id, line_no, item_id, quantity, unit_price, discount_pct, received_qty)
      VALUES (v_po, l, v_item, v_qty, v_price, v_disc, v_recv);

      add_move(LEAST(v_date + TRUNC(DBMS_RANDOM.VALUE(3, 16)), c_to), v_item,
               CASE WHEN v_kind IN ('CHEM', 'SPARE') THEN w_store ELSE w_raw END,
               'PURCHASE_RECEIPT', v_recv, v_doc);
    END LOOP;
  END LOOP;

  -- Weighbridge tickets for domestic waste paper deliveries
  FOR i IN 1 .. 900 LOOP
    v_date := c_from + TRUNC((i - 1) * c_span / 900 + DBMS_RANDOM.VALUE(0, 1)) + DBMS_RANDOM.VALUE(0.25, 0.75);
    v_idx := TRUNC(DBMS_RANDOM.VALUE(1, sup_dom_waste.COUNT + 1));
    v_sup := sup_dom_waste(v_idx);
    v_item := CASE WHEN DBMS_RANDOM.VALUE < 0.7 THEN i_occ95 ELSE i_mix END;
    v_gross := ROUND(DBMS_RANDOM.VALUE(26000, 40000));
    v_tare := ROUND(DBMS_RANDOM.VALUE(13000, 16000));
    -- a few suppliers are systematically worse (wet or contaminated loads)
    v_moist := ROUND(8 + DBMS_RANDOM.VALUE(0, 5)
                     + CASE sup_dom_codes(v_idx) WHEN 'SUP-004' THEN 4 WHEN 'SUP-014' THEN 2 ELSE 0 END, 2);
    v_contam := ROUND(DBMS_RANDOM.VALUE(0.5, 2.5)
                      + CASE sup_dom_codes(v_idx) WHEN 'SUP-005' THEN 3 WHEN 'SUP-014' THEN 1.5 ELSE 0 END, 2);
    v_payable := ROUND((v_gross - v_tare) * (1 - GREATEST(v_moist - 12, 0) / 100 - v_contam / 100));
    v_doc := 'WB-' || TO_CHAR(v_date, 'YYMMDD') || '-' || LPAD(i, 4, '0');

    INSERT INTO weighbridge_tickets (ticket_no, ticket_date, supplier_id, item_id, vehicle_plate,
                                     gross_kg, tare_kg, moisture_pct, contamination_pct)
    VALUES (v_doc, v_date, v_sup, v_item,
            LPAD(TRUNC(DBMS_RANDOM.VALUE(1, 82)), 2, '0') || ' ' || DBMS_RANDOM.STRING('U', 2) || ' '
              || TRUNC(DBMS_RANDOM.VALUE(100, 1000)),
            v_gross, v_tare, v_moist, v_contam);

    add_move(v_date, v_item, w_raw, 'PURCHASE_RECEIPT', v_payable, v_doc);
  END LOOP;

  -- Work orders with material consumption, production receipts and shipments
  FOR i IN 1 .. 320 LOOP
    v_date := c_from + TRUNC((i - 1) * (c_span + 20) / 320 + DBMS_RANDOM.VALUE(0, 1));
    IF DBMS_RANDOM.VALUE < 0.55 THEN
      v_is_pm := TRUE;
      v_item := pick(it_sf);
      v_machine := CASE WHEN DBMS_RANDOM.VALUE < 0.5 THEN 'PM1' ELSE 'PM2' END;
      v_planned := ROUND(DBMS_RANDOM.VALUE(40000, 160000), -3);
      v_scrap_rate := CASE v_machine WHEN 'PM1' THEN DBMS_RANDOM.VALUE(0.02, 0.04) ELSE DBMS_RANDOM.VALUE(0.03, 0.07) END;
    ELSE
      v_is_pm := FALSE;
      v_item := pick(it_fg);
      v_machine := CASE WHEN DBMS_RANDOM.VALUE < 0.5 THEN 'CORR1' ELSE 'CORR2' END;
      v_planned := ROUND(DBMS_RANDOM.VALUE(5000, 60000), -2);
      v_scrap_rate := CASE v_machine WHEN 'CORR1' THEN DBMS_RANDOM.VALUE(0.01, 0.03) ELSE DBMS_RANDOM.VALUE(0.02, 0.05) END;
    END IF;

    v_end := v_date + TRUNC(DBMS_RANDOM.VALUE(1, 5));
    IF v_end <= c_to - 3 THEN
      v_status := CASE WHEN v_end < c_to - 30 THEN 'CLOSED' ELSE 'COMPLETED' END;
      v_produced := ROUND(v_planned * DBMS_RANDOM.VALUE(0.92, 1.03));
      v_actual_end := LEAST(GREATEST(v_end + TRUNC(DBMS_RANDOM.VALUE(-1, 3)), v_date), c_to);
    ELSIF v_date <= c_to THEN
      v_status := 'IN_PROGRESS';
      v_produced := ROUND(v_planned * DBMS_RANDOM.VALUE(0.2, 0.7));
      v_actual_end := NULL;
    ELSE
      v_status := CASE WHEN DBMS_RANDOM.VALUE < 0.5 THEN 'RELEASED' ELSE 'PLANNED' END;
      v_produced := 0;
      v_actual_end := NULL;
    END IF;
    v_scrap := ROUND(v_produced * v_scrap_rate);
    v_doc := 'WO-' || TO_CHAR(v_date, 'YYYY') || '-' || LPAD(i, 5, '0');

    INSERT INTO work_orders (work_order_no, item_id, machine_code, planned_qty, produced_qty, scrap_qty,
                             planned_start, planned_end, actual_end, status)
    VALUES (v_doc, v_item, v_machine, v_planned, v_produced, v_scrap, v_date, v_end, v_actual_end, v_status);

    IF v_produced > 0 THEN
      v_mdate := NVL(v_actual_end, c_to);
      IF v_is_pm THEN
        add_move(v_mdate, v_item, w_reel, 'PRODUCTION_RECEIPT', v_produced, v_doc);
        add_move(v_mdate,
                 CASE WHEN v_item = i_kl150 THEN i_kraft_pulp
                      WHEN DBMS_RANDOM.VALUE < 0.75 THEN i_occ95 ELSE i_occ_imp END,
                 w_raw, 'PRODUCTION_ISSUE', -ROUND((v_produced + v_scrap) * 1.12), v_doc);
        add_move(v_mdate, i_starch, w_store, 'PRODUCTION_ISSUE', -ROUND(v_produced * 0.012), v_doc);
        IF v_status IN ('COMPLETED', 'CLOSED') THEN
          v_ship_seq := v_ship_seq + 1;
          add_move(LEAST(v_mdate + TRUNC(DBMS_RANDOM.VALUE(2, 21)), c_to), v_item, w_reel, 'SALES_SHIPMENT',
                   -ROUND(v_produced * DBMS_RANDOM.VALUE(0.5, 0.8)), 'SH-' || LPAD(v_ship_seq, 6, '0'));
        END IF;
      ELSE
        v_wh := CASE WHEN DBMS_RANDOM.VALUE < 0.8 THEN w_fg ELSE w_ankara END;
        add_move(v_mdate, v_item, v_wh, 'PRODUCTION_RECEIPT', v_produced, v_doc);
        v_kg := (v_produced + v_scrap) * 0.6;
        add_move(v_mdate, pick(it_liner), w_reel, 'PRODUCTION_ISSUE', -ROUND(v_kg * 0.6), v_doc);
        add_move(v_mdate, pick(it_fluting), w_reel, 'PRODUCTION_ISSUE', -ROUND(v_kg * 0.4), v_doc);
        IF v_status IN ('COMPLETED', 'CLOSED') THEN
          v_ship_n := TRUNC(DBMS_RANDOM.VALUE(1, 4));
          v_ship_pct := DBMS_RANDOM.VALUE(0.85, 1.0);
          FOR s IN 1 .. v_ship_n LOOP
            v_ship_seq := v_ship_seq + 1;
            add_move(LEAST(v_mdate + TRUNC(DBMS_RANDOM.VALUE(1, 26)), c_to), v_item, v_wh, 'SALES_SHIPMENT',
                     -ROUND(v_produced * v_ship_pct / v_ship_n), 'SH-' || LPAD(v_ship_seq, 6, '0'));
          END LOOP;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Maintenance consumption of spare parts
  FOR i IN 1 .. 60 LOOP
    add_move(c_from + TRUNC(DBMS_RANDOM.VALUE(0, c_span + 1)), pick(it_spare), w_store,
             'PRODUCTION_ISSUE', -1, 'MNT-' || LPAD(i, 4, '0'));
  END LOOP;

  -- Year-end style stock count: no item/warehouse may end with a negative balance
  FOR r IN (SELECT item_id, warehouse_id, SUM(quantity) AS bal
              FROM stock_movements
             GROUP BY item_id, warehouse_id
            HAVING SUM(quantity) < 0) LOOP
    add_move(c_to, r.item_id, r.warehouse_id, 'ADJUSTMENT', ROUND(-r.bal * 1.1), 'COUNT-2026-09');
  END LOOP;

  COMMIT;
END;
/
