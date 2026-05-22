-- T.E.K Nurse — 0001_initial_schema.sql
-- Tables, enums, CHECK constraints, indexes, updated_at triggers.
-- No RLS (see 0002). No business logic (see 0003).

-- ============================================================================
-- Extensions
-- ============================================================================

create extension if not exists "pgcrypto";     -- gen_random_uuid()
create extension if not exists "pg_trgm";      -- trigram search (used in Phase 3)

-- ============================================================================
-- Enums
-- ============================================================================

create type public.user_role as enum ('staff', 'student');

create type public.equipment_request_status as enum (
  'PENDING_PICKUP',
  'APPROVED',
  'EXPIRED',
  'SKIPPED',
  'CANCELLED'
);

create type public.consumable_request_status as enum (
  'PENDING_PICKUP',
  'APPROVED',
  'EXPIRED',
  'CANCELLED'
);

create type public.borrow_transaction_status as enum (
  'BORROWED',
  'RETURNED',
  'OVERDUE',
  'LOST',
  'RETURNED_LATE'
);

create type public.pending_email_status as enum (
  'QUEUED',
  'SENT',
  'FAILED'
);

-- ============================================================================
-- updated_at helper (used by triggers below)
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- users (mirror of auth.users with profile + role)
-- ============================================================================

create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  role         public.user_role not null default 'student',
  full_name    text not null,
  year_section text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint users_email_domain check (email like '%@cit.edu')
);

create index users_role_idx on public.users (role);
create index users_email_idx on public.users (lower(email));

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ============================================================================
-- equipment_sku
-- ============================================================================

create table public.equipment_sku (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  photo_url           text,
  qr_code             text not null unique,
  total_units         int  not null,
  available_units     int  not null,
  borrowed_units      int  not null default 0,
  reserved_units      int  not null default 0,
  maintenance_units   int  not null default 0,
  lost_units          int  not null default 0,
  low_stock_threshold int  not null default 1,
  location            text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.users(id) on delete set null,
  constraint equipment_units_nonneg check (
    total_units >= 0
    and available_units >= 0
    and borrowed_units >= 0
    and reserved_units >= 0
    and maintenance_units >= 0
    and lost_units >= 0
  ),
  constraint equipment_units_invariant check (
    total_units = available_units + borrowed_units + reserved_units
                + maintenance_units + lost_units
  ),
  constraint equipment_low_stock_nonneg check (low_stock_threshold >= 0)
);

create index equipment_sku_name_trgm_idx
  on public.equipment_sku using gin (name gin_trgm_ops);

create trigger equipment_sku_set_updated_at
  before update on public.equipment_sku
  for each row execute function public.set_updated_at();

-- ============================================================================
-- consumable_sku
-- ============================================================================

create table public.consumable_sku (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  description              text,
  photo_url                text,
  qr_code                  text not null unique,
  unit                     text not null,
  low_stock_threshold      int  not null default 10,
  expiration_warning_days  int  not null default 30,
  per_request_max_quantity int  not null default 20,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references public.users(id) on delete set null,
  constraint consumable_thresholds_nonneg check (
    low_stock_threshold >= 0
    and expiration_warning_days >= 0
    and per_request_max_quantity > 0
  )
);

create index consumable_sku_name_trgm_idx
  on public.consumable_sku using gin (name gin_trgm_ops);

create trigger consumable_sku_set_updated_at
  before update on public.consumable_sku
  for each row execute function public.set_updated_at();

-- ============================================================================
-- consumable_lot
-- ============================================================================

create table public.consumable_lot (
  id                  uuid primary key default gen_random_uuid(),
  consumable_sku_id   uuid not null references public.consumable_sku(id) on delete cascade,
  lot_number          text,
  received_date       date not null,
  expiration_date     date not null,
  quantity_received   int  not null,
  quantity_remaining  int  not null,
  is_depleted         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.users(id) on delete set null,
  constraint consumable_lot_quantities_nonneg check (
    quantity_received >= 0 and quantity_remaining >= 0
  ),
  constraint consumable_lot_remaining_le_received check (
    quantity_remaining <= quantity_received
  ),
  constraint consumable_lot_dates_sane check (
    expiration_date >= received_date
  )
);

create index consumable_lot_fifo_idx
  on public.consumable_lot (consumable_sku_id, expiration_date)
  where is_depleted = false;

create index consumable_lot_expiring_idx
  on public.consumable_lot (expiration_date)
  where is_depleted = false;

create trigger consumable_lot_set_updated_at
  before update on public.consumable_lot
  for each row execute function public.set_updated_at();

-- ============================================================================
-- borrow_request (pre-request for equipment)
-- ============================================================================

create table public.borrow_request (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.users(id) on delete cascade,
  equipment_sku_id     uuid not null references public.equipment_sku(id) on delete restrict,
  quantity             int  not null default 1,
  borrow_date          date not null,
  expected_return_date date not null,
  status               public.equipment_request_status not null default 'PENDING_PICKUP',
  expires_at           timestamptz not null,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint borrow_request_quantity_positive check (quantity > 0),
  constraint borrow_request_dates_sane check (expected_return_date >= borrow_date)
);

create index borrow_request_student_status_idx
  on public.borrow_request (student_id, status);

create index borrow_request_sku_status_idx
  on public.borrow_request (equipment_sku_id, status);

create index borrow_request_expiry_idx
  on public.borrow_request (expires_at)
  where status = 'PENDING_PICKUP';

create trigger borrow_request_set_updated_at
  before update on public.borrow_request
  for each row execute function public.set_updated_at();

-- ============================================================================
-- consumable_request (pre-request for consumables)
-- ============================================================================

create table public.consumable_request (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.users(id) on delete cascade,
  consumable_sku_id  uuid not null references public.consumable_sku(id) on delete restrict,
  quantity           int  not null,
  borrow_date        date not null,
  status             public.consumable_request_status not null default 'PENDING_PICKUP',
  expires_at         timestamptz not null,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint consumable_request_quantity_positive check (quantity > 0)
);

create index consumable_request_student_status_idx
  on public.consumable_request (student_id, status);

create index consumable_request_sku_status_idx
  on public.consumable_request (consumable_sku_id, status);

create index consumable_request_expiry_idx
  on public.consumable_request (expires_at)
  where status = 'PENDING_PICKUP';

create trigger consumable_request_set_updated_at
  before update on public.consumable_request
  for each row execute function public.set_updated_at();

-- ============================================================================
-- borrow_transaction
-- ============================================================================

create table public.borrow_transaction (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.users(id) on delete restrict,
  equipment_sku_id     uuid not null references public.equipment_sku(id) on delete restrict,
  quantity             int  not null default 1,
  borrowed_at          timestamptz not null default now(),
  expected_return_date date not null,
  returned_at          timestamptz,
  status               public.borrow_transaction_status not null default 'BORROWED',
  approved_by          uuid not null references public.users(id) on delete restrict,
  returned_to          uuid references public.users(id) on delete restrict,
  source_request_id    uuid references public.borrow_request(id) on delete set null,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint borrow_transaction_quantity_positive check (quantity > 0),
  constraint borrow_transaction_returned_consistency check (
    (status in ('RETURNED', 'RETURNED_LATE') and returned_at is not null and returned_to is not null)
    or (status in ('BORROWED', 'OVERDUE', 'LOST') and returned_at is null and returned_to is null)
  )
);

create index borrow_transaction_student_status_idx
  on public.borrow_transaction (student_id, status);

create index borrow_transaction_sku_status_idx
  on public.borrow_transaction (equipment_sku_id, status);

create index borrow_transaction_overdue_idx
  on public.borrow_transaction (expected_return_date)
  where status in ('BORROWED', 'OVERDUE');

create trigger borrow_transaction_set_updated_at
  before update on public.borrow_transaction
  for each row execute function public.set_updated_at();

-- ============================================================================
-- consumable_usage
-- ============================================================================

create table public.consumable_usage (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.users(id) on delete restrict,
  consumable_sku_id  uuid not null references public.consumable_sku(id) on delete restrict,
  quantity_used      int  not null,
  used_at            timestamptz not null default now(),
  approved_by        uuid not null references public.users(id) on delete restrict,
  source_request_id  uuid references public.consumable_request(id) on delete set null,
  notes              text,
  created_at         timestamptz not null default now(),
  constraint consumable_usage_quantity_positive check (quantity_used > 0)
);

create index consumable_usage_student_idx
  on public.consumable_usage (student_id, used_at desc);

create index consumable_usage_sku_idx
  on public.consumable_usage (consumable_sku_id, used_at desc);

-- ============================================================================
-- consumable_usage_lot_deduction
-- ============================================================================

create table public.consumable_usage_lot_deduction (
  id                   uuid primary key default gen_random_uuid(),
  consumable_usage_id  uuid not null references public.consumable_usage(id) on delete cascade,
  lot_id               uuid not null references public.consumable_lot(id) on delete restrict,
  quantity_deducted    int  not null,
  constraint consumable_usage_lot_deduction_quantity_positive check (quantity_deducted > 0)
);

create index consumable_usage_lot_deduction_usage_idx
  on public.consumable_usage_lot_deduction (consumable_usage_id);

create index consumable_usage_lot_deduction_lot_idx
  on public.consumable_usage_lot_deduction (lot_id);

-- ============================================================================
-- notification (in-app inbox)
-- ============================================================================

create table public.notification (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link_url   text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index notification_user_unread_idx
  on public.notification (user_id, created_at desc)
  where is_read = false;

create index notification_user_idx
  on public.notification (user_id, created_at desc);

-- ============================================================================
-- pending_email (provider-agnostic email queue; worker lands in Phase 8)
-- ============================================================================

create table public.pending_email (
  id          uuid primary key default gen_random_uuid(),
  to_email    text not null,
  to_user_id  uuid references public.users(id) on delete set null,
  template    text not null,
  payload     jsonb not null default '{}'::jsonb,
  status      public.pending_email_status not null default 'QUEUED',
  attempts    int  not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  constraint pending_email_attempts_nonneg check (attempts >= 0)
);

create index pending_email_queue_idx
  on public.pending_email (created_at)
  where status = 'QUEUED';

-- ============================================================================
-- audit_log (write-only from triggers; read-only from clients)
-- ============================================================================

create table public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  timestamp     timestamptz not null default now(),
  actor_id      uuid not null references public.users(id) on delete restrict,
  action_type   text not null,
  entity_type   text not null,
  entity_id     uuid not null,
  before_value  jsonb,
  after_value   jsonb,
  notes         text
);

create index audit_log_timestamp_idx       on public.audit_log (timestamp desc);
create index audit_log_actor_idx           on public.audit_log (actor_id, timestamp desc);
create index audit_log_entity_idx          on public.audit_log (entity_type, entity_id);
create index audit_log_action_idx          on public.audit_log (action_type, timestamp desc);
