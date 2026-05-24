-- T.E.K Nurse — seed.sql
-- Run AFTER 0001 / 0002 / 0003 against a fresh database.
-- Disables triggers (session_replication_role=replica) so we can stamp
-- historical state directly without firing the count-bucket movement
-- triggers (which expect a live auth.uid()).
--
-- Reset between seed runs: drop the rows from auth.users for these emails,
-- or `truncate auth.users cascade` (Supabase Studio: SQL Editor as postgres).

set session_replication_role = replica;

-- ============================================================================
-- Users  (auth.users + public.users)
-- Passwords: all four accounts use 'TekNurse123!' for capstone demo only.
-- Change before sharing with anyone outside the team.
-- ============================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated',
   'staff.nurse@cit.edu', crypt('TekNurse123!', gen_salt('bf')),
   now(), null, null,
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Mara Lim, RN"}',
   now(), now(), '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated',
   'maria.cruz@cit.edu', crypt('TekNurse123!', gen_salt('bf')),
   now(), null, null,
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Maria Cruz","student_id":"12-3456-789"}',
   now(), now(), '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000',
   '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated',
   'jose.santos@cit.edu', crypt('TekNurse123!', gen_salt('bf')),
   now(), null, null,
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Jose Santos","student_id":"12-3456-790"}',
   now(), now(), '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000',
   '44444444-4444-4444-4444-444444444444',
   'authenticated', 'authenticated',
   'ana.reyes@cit.edu', crypt('TekNurse123!', gen_salt('bf')),
   now(), null, null,
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Ana Reyes","student_id":"12-3456-791"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into public.users (id, email, role, full_name, student_id, staff_id, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'staff.nurse@cit.edu', 'staff',  'Mara Lim, RN', null,          'TEK-001', true),
  ('22222222-2222-2222-2222-222222222222', 'maria.cruz@cit.edu', 'student', 'Maria Cruz',   '12-3456-789', null,      true),
  ('33333333-3333-3333-3333-333333333333', 'jose.santos@cit.edu','student', 'Jose Santos',  '12-3456-790', null,      true),
  ('44444444-4444-4444-4444-444444444444', 'ana.reyes@cit.edu',  'student', 'Ana Reyes',    '12-3456-791', null,      true)
on conflict (id) do nothing;

-- ============================================================================
-- equipment_sku  (8 SKUs covering common nursing-lab items)
-- Count buckets reflect post-historical-state (T1..T6 below already applied).
-- ============================================================================

insert into public.equipment_sku (
  id, name, description, qr_code,
  total_units, available_units, borrowed_units, reserved_units,
  maintenance_units, lost_units, low_stock_threshold, location, created_by
) values
  ('10000000-0000-0000-0000-000000000001',
   'Stethoscope', 'Dual-head acoustic stethoscope for general assessment.',
   'STH-001', 10, 8, 2, 0, 0, 0, 2, 'Cabinet A · Drawer 1',
   '11111111-1111-1111-1111-111111111111'),

  ('10000000-0000-0000-0000-000000000002',
   'Sphygmomanometer', 'Aneroid blood pressure cuff, adult size.',
   'SPH-001', 6, 6, 0, 0, 0, 0, 1, 'Cabinet A · Drawer 2',
   '11111111-1111-1111-1111-111111111111'),

  ('10000000-0000-0000-0000-000000000003',
   'Digital Thermometer', 'Oral/axillary digital thermometer.',
   'THM-001', 12, 10, 0, 0, 1, 1, 2, 'Cabinet A · Drawer 3',
   '11111111-1111-1111-1111-111111111111'),

  ('10000000-0000-0000-0000-000000000004',
   'Resuscitation Bag', 'Adult bag-valve mask (BVM) with reservoir.',
   'BAG-001', 4, 4, 0, 0, 0, 0, 1, 'Cabinet B · Shelf 1',
   '11111111-1111-1111-1111-111111111111'),

  ('10000000-0000-0000-0000-000000000005',
   'Otoscope', 'LED otoscope with disposable specula.',
   'OTO-001', 3, 2, 1, 0, 0, 0, 1, 'Cabinet B · Shelf 2',
   '11111111-1111-1111-1111-111111111111'),

  ('10000000-0000-0000-0000-000000000006',
   'Penlight', 'Pupillary penlight, reusable.',
   'PEN-001', 15, 14, 0, 0, 0, 1, 3, 'Cabinet A · Drawer 4',
   '11111111-1111-1111-1111-111111111111'),

  ('10000000-0000-0000-0000-000000000007',
   'Reflex Hammer', 'Taylor-style neurological reflex hammer.',
   'REF-001', 8, 8, 0, 0, 0, 0, 2, 'Cabinet A · Drawer 5',
   '11111111-1111-1111-1111-111111111111'),

  ('10000000-0000-0000-0000-000000000008',
   'Bandage Scissors', 'Lister bandage scissors, 5.5 inch.',
   'SCI-001', 6, 5, 1, 0, 0, 0, 1, 'Cabinet B · Shelf 3',
   '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- ============================================================================
-- consumable_sku  (4 SKUs)
-- ============================================================================

insert into public.consumable_sku (
  id, name, description, qr_code, unit,
  low_stock_threshold, expiration_warning_days, per_request_max_quantity,
  created_by
) values
  ('20000000-0000-0000-0000-000000000001',
   'Cotton Balls', 'Sterile cotton balls.', 'CTN', 'piece', 50, 30, 100,
   '11111111-1111-1111-1111-111111111111'),

  ('20000000-0000-0000-0000-000000000002',
   'Gauze Pads', '4x4 sterile gauze pads.', 'GAU', 'piece', 100, 30, 50,
   '11111111-1111-1111-1111-111111111111'),

  ('20000000-0000-0000-0000-000000000003',
   'Alcohol Prep Pads', '70% isopropyl alcohol prep pads.', 'ALC', 'piece', 100, 30, 100,
   '11111111-1111-1111-1111-111111111111'),

  ('20000000-0000-0000-0000-000000000004',
   'Disposable Syringes 5ml', 'Sterile single-use 5ml syringes.', 'SYR', 'piece', 25, 60, 30,
   '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- ============================================================================
-- consumable_lot  (multiple per SKU, staggered expiration so FIFO is testable)
-- quantity_remaining reflects historical usage (U1..U5 below).
-- ============================================================================

insert into public.consumable_lot (
  id, consumable_sku_id, lot_number,
  received_date, expiration_date,
  quantity_received, quantity_remaining, is_depleted, created_by
) values
  -- Cotton Balls
  ('30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'CTN-2025-Q4',
   '2025-12-15', '2026-11-15', 100, 0,  true,
   '11111111-1111-1111-1111-111111111111'),
  ('30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001', 'CTN-2026-Q1',
   '2026-03-01', '2027-03-15', 250, 195, false,
   '11111111-1111-1111-1111-111111111111'),
  ('30000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000001', 'CTN-2026-Q2',
   '2026-05-10', '2027-08-20', 100, 100, false,
   '11111111-1111-1111-1111-111111111111'),

  -- Gauze Pads
  ('30000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000002', 'GAU-2026-Q1',
   '2026-02-01', '2026-12-10', 200, 150, false,
   '11111111-1111-1111-1111-111111111111'),
  ('30000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000002', 'GAU-2026-Q2',
   '2026-04-15', '2027-04-15', 300, 300, false,
   '11111111-1111-1111-1111-111111111111'),

  -- Alcohol Prep
  ('30000000-0000-0000-0000-000000000006',
   '20000000-0000-0000-0000-000000000003', 'ALC-2026-Q1',
   '2026-01-20', '2027-01-20', 500, 380, false,
   '11111111-1111-1111-1111-111111111111'),
  ('30000000-0000-0000-0000-000000000007',
   '20000000-0000-0000-0000-000000000003', 'ALC-2026-Q2',
   '2026-04-05', '2027-04-05', 500, 500, false,
   '11111111-1111-1111-1111-111111111111'),

  -- Syringes
  ('30000000-0000-0000-0000-000000000008',
   '20000000-0000-0000-0000-000000000004', 'SYR-2026-Q1',
   '2026-03-01', '2028-03-01', 100, 80, false,
   '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- ============================================================================
-- borrow_transaction  (T1..T6)
-- T1..T4 are active BORROWED (already reflected in equipment count buckets).
-- T5..T6 are RETURNED (don't affect current counts).
-- ============================================================================

insert into public.borrow_transaction (
  id, student_id, equipment_sku_id, quantity,
  borrowed_at, expected_return_date, returned_at,
  status, approved_by, returned_to, source_request_id, notes
) values
  -- T1: Maria has a stethoscope out, due tomorrow
  ('40000000-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222',
   '10000000-0000-0000-0000-000000000001', 1,
   '2026-05-20 09:00:00+08', '2026-05-23', null,
   'BORROWED',
   '11111111-1111-1111-1111-111111111111', null, null, null),

  -- T2: Jose has a stethoscope out, due in 3 days
  ('40000000-0000-0000-0000-000000000002',
   '33333333-3333-3333-3333-333333333333',
   '10000000-0000-0000-0000-000000000001', 1,
   '2026-05-21 14:30:00+08', '2026-05-25', null,
   'BORROWED',
   '11111111-1111-1111-1111-111111111111', null, null, null),

  -- T3: Ana has an otoscope out, due in 2 days
  ('40000000-0000-0000-0000-000000000003',
   '44444444-4444-4444-4444-444444444444',
   '10000000-0000-0000-0000-000000000005', 1,
   '2026-05-22 08:15:00+08', '2026-05-24', null,
   'BORROWED',
   '11111111-1111-1111-1111-111111111111', null, null, null),

  -- T4: Maria has bandage scissors out, due in 2 days
  ('40000000-0000-0000-0000-000000000004',
   '22222222-2222-2222-2222-222222222222',
   '10000000-0000-0000-0000-000000000008', 1,
   '2026-05-22 10:00:00+08', '2026-05-24', null,
   'BORROWED',
   '11111111-1111-1111-1111-111111111111', null, null, null),

  -- T5: Maria borrowed a resuscitation bag last week, returned 5 days ago
  ('40000000-0000-0000-0000-000000000005',
   '22222222-2222-2222-2222-222222222222',
   '10000000-0000-0000-0000-000000000004', 1,
   '2026-05-15 11:00:00+08', '2026-05-18', '2026-05-17 16:30:00+08',
   'RETURNED',
   '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111', null, null),

  -- T6: Jose borrowed a reflex hammer 5 days ago, returned the next day
  ('40000000-0000-0000-0000-000000000006',
   '33333333-3333-3333-3333-333333333333',
   '10000000-0000-0000-0000-000000000007', 1,
   '2026-05-17 13:00:00+08', '2026-05-19', '2026-05-18 10:00:00+08',
   'RETURNED',
   '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111', null, null)
on conflict (id) do nothing;

-- ============================================================================
-- consumable_usage  (U1..U5)  +  matching lot_deduction rows
-- ============================================================================

insert into public.consumable_usage (
  id, student_id, consumable_sku_id, quantity_used, used_at,
  approved_by, source_request_id, notes
) values
  -- U1: Maria took 100 cotton balls 3 days ago (depleted Lot A)
  ('50000000-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222',
   '20000000-0000-0000-0000-000000000001', 100,
   '2026-05-19 09:30:00+08',
   '11111111-1111-1111-1111-111111111111', null,
   'Vital signs lab session'),

  -- U2: Maria took 55 cotton balls yesterday (Lot A already empty -> Lot B)
  ('50000000-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222',
   '20000000-0000-0000-0000-000000000001', 55,
   '2026-05-21 13:45:00+08',
   '11111111-1111-1111-1111-111111111111', null, null),

  -- U3: Jose took 50 gauze pads 2 days ago (from Lot A, oldest exp)
  ('50000000-0000-0000-0000-000000000003',
   '33333333-3333-3333-3333-333333333333',
   '20000000-0000-0000-0000-000000000002', 50,
   '2026-05-20 14:00:00+08',
   '11111111-1111-1111-1111-111111111111', null,
   'Wound dressing demonstration'),

  -- U4: Ana took 120 alcohol prep pads yesterday
  ('50000000-0000-0000-0000-000000000004',
   '44444444-4444-4444-4444-444444444444',
   '20000000-0000-0000-0000-000000000003', 120,
   '2026-05-21 10:15:00+08',
   '11111111-1111-1111-1111-111111111111', null, null),

  -- U5: Jose took 20 syringes today
  ('50000000-0000-0000-0000-000000000005',
   '33333333-3333-3333-3333-333333333333',
   '20000000-0000-0000-0000-000000000004', 20,
   '2026-05-22 08:00:00+08',
   '11111111-1111-1111-1111-111111111111', null,
   'Injection practice')
on conflict (id) do nothing;

insert into public.consumable_usage_lot_deduction (
  id, consumable_usage_id, lot_id, quantity_deducted
) values
  -- U1 (100 cotton balls): all 100 from Lot A (which depletes)
  ('60000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001', 100),

  -- U2 (55 cotton balls): all 55 from Lot B (Lot A already depleted)
  ('60000000-0000-0000-0000-000000000002',
   '50000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000002', 55),

  -- U3 (50 gauze): all 50 from Lot A
  ('60000000-0000-0000-0000-000000000003',
   '50000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000004', 50),

  -- U4 (120 alcohol prep): all 120 from Lot A
  ('60000000-0000-0000-0000-000000000004',
   '50000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000006', 120),

  -- U5 (20 syringes): all 20 from Lot A
  ('60000000-0000-0000-0000-000000000005',
   '50000000-0000-0000-0000-000000000005',
   '30000000-0000-0000-0000-000000000008', 20)
on conflict (id) do nothing;

-- ============================================================================
-- audit_log  (representative entries — triggers were off, so we stamp these
-- manually to populate the Phase 11 audit-log UI with realistic content)
-- ============================================================================

insert into public.audit_log (
  id, timestamp, actor_id, action_type, entity_type, entity_id, notes
) values
  ('70000000-0000-0000-0000-000000000001', '2026-05-15 11:00:00+08',
   '11111111-1111-1111-1111-111111111111', 'walk_in_borrow', 'borrow_transaction',
   '40000000-0000-0000-0000-000000000005', 'Maria — Resuscitation Bag (walk-in)'),
  ('70000000-0000-0000-0000-000000000002', '2026-05-17 13:00:00+08',
   '11111111-1111-1111-1111-111111111111', 'walk_in_borrow', 'borrow_transaction',
   '40000000-0000-0000-0000-000000000006', 'Jose — Reflex Hammer (walk-in)'),
  ('70000000-0000-0000-0000-000000000003', '2026-05-17 16:30:00+08',
   '11111111-1111-1111-1111-111111111111', 'return_logged', 'borrow_transaction',
   '40000000-0000-0000-0000-000000000005', 'Maria returned Resuscitation Bag'),
  ('70000000-0000-0000-0000-000000000004', '2026-05-18 10:00:00+08',
   '11111111-1111-1111-1111-111111111111', 'return_logged', 'borrow_transaction',
   '40000000-0000-0000-0000-000000000006', 'Jose returned Reflex Hammer'),
  ('70000000-0000-0000-0000-000000000005', '2026-05-19 09:30:00+08',
   '11111111-1111-1111-1111-111111111111', 'consumable_used', 'consumable_usage',
   '50000000-0000-0000-0000-000000000001', 'Maria — 100 Cotton Balls'),
  ('70000000-0000-0000-0000-000000000006', '2026-05-20 09:00:00+08',
   '11111111-1111-1111-1111-111111111111', 'walk_in_borrow', 'borrow_transaction',
   '40000000-0000-0000-0000-000000000001', 'Maria — Stethoscope (walk-in)'),
  ('70000000-0000-0000-0000-000000000007', '2026-05-20 14:00:00+08',
   '11111111-1111-1111-1111-111111111111', 'consumable_used', 'consumable_usage',
   '50000000-0000-0000-0000-000000000003', 'Jose — 50 Gauze Pads'),
  ('70000000-0000-0000-0000-000000000008', '2026-05-21 10:15:00+08',
   '11111111-1111-1111-1111-111111111111', 'consumable_used', 'consumable_usage',
   '50000000-0000-0000-0000-000000000004', 'Ana — 120 Alcohol Prep Pads'),
  ('70000000-0000-0000-0000-000000000009', '2026-05-21 13:45:00+08',
   '11111111-1111-1111-1111-111111111111', 'consumable_used', 'consumable_usage',
   '50000000-0000-0000-0000-000000000002', 'Maria — 55 Cotton Balls'),
  ('70000000-0000-0000-0000-000000000010', '2026-05-21 14:30:00+08',
   '11111111-1111-1111-1111-111111111111', 'walk_in_borrow', 'borrow_transaction',
   '40000000-0000-0000-0000-000000000002', 'Jose — Stethoscope (walk-in)'),
  ('70000000-0000-0000-0000-000000000011', '2026-05-22 08:00:00+08',
   '11111111-1111-1111-1111-111111111111', 'consumable_used', 'consumable_usage',
   '50000000-0000-0000-0000-000000000005', 'Jose — 20 Syringes'),
  ('70000000-0000-0000-0000-000000000012', '2026-05-22 08:15:00+08',
   '11111111-1111-1111-1111-111111111111', 'walk_in_borrow', 'borrow_transaction',
   '40000000-0000-0000-0000-000000000003', 'Ana — Otoscope (walk-in)'),
  ('70000000-0000-0000-0000-000000000013', '2026-05-22 10:00:00+08',
   '11111111-1111-1111-1111-111111111111', 'walk_in_borrow', 'borrow_transaction',
   '40000000-0000-0000-0000-000000000004', 'Maria — Bandage Scissors (walk-in)')
on conflict (id) do nothing;

-- ============================================================================
-- Restore trigger behavior
-- ============================================================================

set session_replication_role = origin;
