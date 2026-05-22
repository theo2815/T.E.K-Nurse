-- T.E.K Nurse — 0003_functions_and_triggers.sql
-- Business logic: state-machine triggers, FIFO, audit log writer, signup mirror.
-- All trigger functions are SECURITY DEFINER so they can update equipment_sku,
-- write audit_log, enqueue notifications/emails, etc. without being blocked by
-- the RLS policies in 0002. The original action (e.g. a student INSERTing a
-- borrow_request) is still gated by RLS — these triggers fire afterwards.

-- ============================================================================
-- handle_new_user
--   Mirrors auth.users into public.users on signup. role defaults to 'student'.
--   Staff accounts are created via direct UPDATE (no self-signup as staff).
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.users (id, email, full_name, year_section)
  values (
    new.id,
    new.email,
    coalesce(nullif(meta ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(meta ->> 'year_section', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- write_audit_log
--   Single funnel for every state-changing trigger.
--   Reads auth.uid() unless p_actor_id is explicitly passed (Phase 9 cron).
-- ============================================================================

create or replace function public.write_audit_log(
  p_action_type text,
  p_entity_type text,
  p_entity_id   uuid,
  p_before      jsonb default null,
  p_after       jsonb default null,
  p_notes       text  default null,
  p_actor_id    uuid  default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(p_actor_id, auth.uid());
begin
  if v_actor is null then
    raise exception 'write_audit_log: actor_id is required (no auth context)';
  end if;
  insert into public.audit_log
    (actor_id, action_type, entity_type, entity_id, before_value, after_value, notes)
  values
    (v_actor, p_action_type, p_entity_type, p_entity_id, p_before, p_after, p_notes);
end;
$$;

-- ============================================================================
-- enqueue_notification
-- ============================================================================

create or replace function public.enqueue_notification(
  p_user_id  uuid,
  p_type     text,
  p_title    text,
  p_body     text default null,
  p_link_url text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notification (user_id, type, title, body, link_url)
  values (p_user_id, p_type, p_title, p_body, p_link_url);
$$;

create or replace function public.notify_all_staff(
  p_type     text,
  p_title    text,
  p_body     text default null,
  p_link_url text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notification (user_id, type, title, body, link_url)
  select u.id, p_type, p_title, p_body, p_link_url
  from public.users u
  where u.role = 'staff' and u.is_active = true;
$$;

-- ============================================================================
-- enqueue_email
--   Looks up the target user's email; if they have none (shouldn't happen),
--   silently no-ops rather than failing the surrounding transaction.
-- ============================================================================

create or replace function public.enqueue_email(
  p_user_id  uuid,
  p_template text,
  p_payload  jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.pending_email (to_email, to_user_id, template, payload)
  select u.email, u.id, p_template, coalesce(p_payload, '{}'::jsonb)
  from public.users u
  where u.id = p_user_id;
$$;

-- ============================================================================
-- Overdue-block check (defense in depth — UI should check first)
-- ============================================================================

create or replace function public.student_has_overdue(p_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.borrow_transaction
    where student_id = p_student_id
      and status in ('OVERDUE', 'LOST')
  );
$$;

-- ============================================================================
-- borrow_request — INSERT trigger
--   Applies the hard lock and notifies staff. Status is forced to
--   PENDING_PICKUP by the RLS INSERT policy.
-- ============================================================================

create or replace function public.tr_borrow_request_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.student_has_overdue(new.student_id) then
    raise exception 'Student has overdue items and cannot submit new borrow requests'
      using errcode = 'check_violation';
  end if;

  update public.equipment_sku
    set available_units = available_units - new.quantity,
        reserved_units  = reserved_units  + new.quantity
    where id = new.equipment_sku_id;

  perform public.write_audit_log(
    'borrow_request_submitted',
    'borrow_request',
    new.id,
    null,
    to_jsonb(new)
  );

  perform public.notify_all_staff(
    'borrow_request_new',
    'New borrow request',
    'A student submitted a new borrow request.',
    '/staff/requests/' || new.id::text
  );

  return new;
end;
$$;

create trigger borrow_request_after_insert
  after insert on public.borrow_request
  for each row execute function public.tr_borrow_request_after_insert();

-- ============================================================================
-- borrow_request — BEFORE UPDATE: status-transition validation
-- ============================================================================

create or replace function public.tr_borrow_request_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;  -- non-status edits, no transition rules to enforce
  end if;

  -- Terminal states are sticky.
  if old.status in ('APPROVED', 'EXPIRED', 'SKIPPED', 'CANCELLED') then
    raise exception 'borrow_request.status is terminal: % cannot change', old.status;
  end if;

  -- From PENDING_PICKUP, only specific transitions are allowed.
  if old.status = 'PENDING_PICKUP' then
    if new.status not in ('APPROVED', 'EXPIRED', 'SKIPPED', 'CANCELLED') then
      raise exception 'borrow_request: invalid transition % -> %', old.status, new.status;
    end if;
    return new;
  end if;

  raise exception 'borrow_request: unhandled transition % -> %', old.status, new.status;
end;
$$;

create trigger borrow_request_before_update
  before update on public.borrow_request
  for each row execute function public.tr_borrow_request_before_update();

-- ============================================================================
-- borrow_request — AFTER UPDATE: count moves, transaction creation, audit, notifs
-- ============================================================================

create or replace function public.tr_borrow_request_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'PENDING_PICKUP' and new.status = 'APPROVED' then
    update public.equipment_sku
      set reserved_units = reserved_units - old.quantity,
          borrowed_units = borrowed_units + old.quantity
      where id = new.equipment_sku_id;

    insert into public.borrow_transaction (
      student_id, equipment_sku_id, quantity, borrowed_at,
      expected_return_date, status, approved_by, source_request_id
    )
    values (
      new.student_id, new.equipment_sku_id, new.quantity, now(),
      new.expected_return_date, 'BORROWED', auth.uid(), new.id
    );

    perform public.write_audit_log(
      'borrow_request_approved', 'borrow_request', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'borrow_approved', 'Borrow approved',
      'Please collect your equipment from the lab.', '/student/requests/' || new.id::text
    );
    perform public.enqueue_email(new.student_id, 'borrow_confirm',
      jsonb_build_object('request_id', new.id, 'quantity', new.quantity));

  elsif old.status = 'PENDING_PICKUP' and new.status in ('EXPIRED', 'SKIPPED', 'CANCELLED') then
    update public.equipment_sku
      set reserved_units  = reserved_units  - old.quantity,
          available_units = available_units + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'borrow_request_' || lower(new.status::text),
      'borrow_request', new.id, to_jsonb(old), to_jsonb(new)
    );

    if new.status in ('EXPIRED', 'SKIPPED') then
      perform public.enqueue_notification(
        new.student_id,
        case new.status when 'EXPIRED' then 'borrow_expired' else 'borrow_skipped' end,
        case new.status when 'EXPIRED' then 'Request expired' else 'Request skipped' end,
        case new.status
          when 'EXPIRED' then 'Your borrow request expired before pickup.'
          else 'Staff issued the units to another borrower. Please re-request.'
        end
      );
      perform public.enqueue_email(
        new.student_id,
        case new.status when 'EXPIRED' then 'borrow_expired' else 'borrow_skipped' end,
        jsonb_build_object('request_id', new.id)
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger borrow_request_after_update
  after update on public.borrow_request
  for each row execute function public.tr_borrow_request_after_update();

-- ============================================================================
-- borrow_transaction — AFTER INSERT
--   If walk-in (source_request_id IS NULL): apply count move + audit + notif.
--   If from approved pre-request: counts already moved by the request trigger,
--   so we only audit the transaction creation.
-- ============================================================================

create or replace function public.tr_borrow_transaction_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_request_id is null then
    if public.student_has_overdue(new.student_id) then
      raise exception 'Student has overdue items and cannot borrow'
        using errcode = 'check_violation';
    end if;

    update public.equipment_sku
      set available_units = available_units - new.quantity,
          borrowed_units  = borrowed_units  + new.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'walk_in_borrow', 'borrow_transaction', new.id, null, to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'borrow_confirm', 'Equipment borrowed',
      'You borrowed ' || new.quantity || ' unit(s). Expected return: ' || new.expected_return_date,
      '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'borrow_confirm',
      jsonb_build_object('transaction_id', new.id, 'quantity', new.quantity,
                         'expected_return_date', new.expected_return_date));
  else
    perform public.write_audit_log(
      'borrow_transaction_created', 'borrow_transaction', new.id, null, to_jsonb(new)
    );
  end if;

  return new;
end;
$$;

create trigger borrow_transaction_after_insert
  after insert on public.borrow_transaction
  for each row execute function public.tr_borrow_transaction_after_insert();

-- ============================================================================
-- borrow_transaction — BEFORE UPDATE: validate transitions
-- ============================================================================

create or replace function public.tr_borrow_transaction_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  -- Allowed transitions:
  --   BORROWED      -> RETURNED | OVERDUE | LOST
  --   OVERDUE       -> RETURNED_LATE | LOST
  --   LOST          -> RETURNED_LATE  (manual revert)
  --   RETURNED, RETURNED_LATE -> (terminal)
  if old.status in ('RETURNED', 'RETURNED_LATE') then
    raise exception 'borrow_transaction.status is terminal: % cannot change', old.status;
  end if;

  if not (
       (old.status = 'BORROWED' and new.status in ('RETURNED', 'OVERDUE', 'LOST'))
    or (old.status = 'OVERDUE'  and new.status in ('RETURNED_LATE', 'LOST'))
    or (old.status = 'LOST'     and new.status = 'RETURNED_LATE')
  ) then
    raise exception 'borrow_transaction: invalid transition % -> %', old.status, new.status;
  end if;

  -- Stamp returned_at / returned_to defaults if the client didn't.
  if new.status in ('RETURNED', 'RETURNED_LATE') and new.returned_at is null then
    new.returned_at := now();
  end if;
  if new.status in ('RETURNED', 'RETURNED_LATE') and new.returned_to is null then
    new.returned_to := auth.uid();
  end if;

  return new;
end;
$$;

create trigger borrow_transaction_before_update
  before update on public.borrow_transaction
  for each row execute function public.tr_borrow_transaction_before_update();

-- ============================================================================
-- borrow_transaction — AFTER UPDATE: count moves + audit + notifs
-- ============================================================================

create or replace function public.tr_borrow_transaction_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status in ('BORROWED', 'OVERDUE') and new.status in ('RETURNED', 'RETURNED_LATE') then
    update public.equipment_sku
      set borrowed_units  = borrowed_units  - old.quantity,
          available_units = available_units + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'return_logged', 'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'return_confirm', 'Return logged',
      'Thanks — your item has been logged as returned.', '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'return_confirm',
      jsonb_build_object('transaction_id', new.id));

  elsif old.status = 'LOST' and new.status = 'RETURNED_LATE' then
    update public.equipment_sku
      set lost_units      = lost_units      - old.quantity,
          available_units = available_units + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'lost_item_returned', 'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );

  elsif old.status = 'BORROWED' and new.status = 'OVERDUE' then
    perform public.write_audit_log(
      'marked_overdue', 'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'overdue_reminder', 'Item overdue',
      'Please return your borrowed item as soon as possible.', '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'overdue_reminder',
      jsonb_build_object('transaction_id', new.id, 'expected_return_date', new.expected_return_date));

  elsif old.status in ('BORROWED', 'OVERDUE') and new.status = 'LOST' then
    update public.equipment_sku
      set borrowed_units = borrowed_units - old.quantity,
          lost_units     = lost_units     + old.quantity
      where id = new.equipment_sku_id;

    perform public.write_audit_log(
      'marked_lost', 'borrow_transaction', new.id, to_jsonb(old), to_jsonb(new)
    );
    perform public.enqueue_notification(
      new.student_id, 'marked_lost', 'Item marked lost',
      'Your borrowed item has been marked as lost. Please contact the lab.', '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'marked_lost',
      jsonb_build_object('transaction_id', new.id));
  end if;

  return new;
end;
$$;

create trigger borrow_transaction_after_update
  after update on public.borrow_transaction
  for each row execute function public.tr_borrow_transaction_after_update();

-- ============================================================================
-- consumable_request — AFTER INSERT
-- ============================================================================

create or replace function public.tr_consumable_request_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.student_has_overdue(new.student_id) then
    raise exception 'Student has overdue items and cannot submit new requests'
      using errcode = 'check_violation';
  end if;

  perform public.write_audit_log(
    'consumable_request_submitted', 'consumable_request', new.id, null, to_jsonb(new)
  );
  perform public.notify_all_staff(
    'consumable_request_new', 'New consumable request',
    'A student requested consumables.',
    '/staff/requests/c/' || new.id::text
  );
  return new;
end;
$$;

create trigger consumable_request_after_insert
  after insert on public.consumable_request
  for each row execute function public.tr_consumable_request_after_insert();

-- ============================================================================
-- consumable_request — BEFORE UPDATE
-- ============================================================================

create or replace function public.tr_consumable_request_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;
  if old.status in ('APPROVED', 'EXPIRED', 'CANCELLED') then
    raise exception 'consumable_request.status is terminal: % cannot change', old.status;
  end if;
  if old.status = 'PENDING_PICKUP' and new.status not in ('APPROVED', 'EXPIRED', 'CANCELLED') then
    raise exception 'consumable_request: invalid transition % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

create trigger consumable_request_before_update
  before update on public.consumable_request
  for each row execute function public.tr_consumable_request_before_update();

-- ============================================================================
-- consumable_request — AFTER UPDATE
--   On approval, create the consumable_usage row; FIFO trigger does the rest.
-- ============================================================================

create or replace function public.tr_consumable_request_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'PENDING_PICKUP' and new.status = 'APPROVED' then
    insert into public.consumable_usage (
      student_id, consumable_sku_id, quantity_used, used_at,
      approved_by, source_request_id
    )
    values (
      new.student_id, new.consumable_sku_id, new.quantity, now(),
      auth.uid(), new.id
    );
    perform public.write_audit_log(
      'consumable_request_approved', 'consumable_request', new.id, to_jsonb(old), to_jsonb(new)
    );

  elsif old.status = 'PENDING_PICKUP' and new.status in ('EXPIRED', 'CANCELLED') then
    perform public.write_audit_log(
      'consumable_request_' || lower(new.status::text),
      'consumable_request', new.id, to_jsonb(old), to_jsonb(new)
    );
    if new.status = 'EXPIRED' then
      perform public.enqueue_notification(
        new.student_id, 'consumable_request_expired', 'Request expired',
        'Your consumable request expired before pickup.', '/student/requests'
      );
      perform public.enqueue_email(new.student_id, 'consumable_request_expired',
        jsonb_build_object('request_id', new.id));
    end if;
  end if;

  return new;
end;
$$;

create trigger consumable_request_after_update
  after update on public.consumable_request
  for each row execute function public.tr_consumable_request_after_update();

-- ============================================================================
-- consumable_usage — AFTER INSERT
--   FIFO deduction across lots, lot_deduction rows, lot depletion, audit,
--   low-stock alert, student notification + email.
-- ============================================================================

create or replace function public.tr_consumable_usage_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining int := new.quantity_used;
  v_take    int;
  v_lot     record;
  v_total   int;
  v_thresh  int;
  v_sku     public.consumable_sku%rowtype;
begin
  if new.source_request_id is null and public.student_has_overdue(new.student_id) then
    raise exception 'Student has overdue items and cannot use consumables'
      using errcode = 'check_violation';
  end if;

  for v_lot in
    select id, quantity_remaining
    from public.consumable_lot
    where consumable_sku_id = new.consumable_sku_id
      and is_depleted = false
      and quantity_remaining > 0
    order by expiration_date asc, received_date asc
    for update
  loop
    exit when remaining <= 0;
    v_take := least(remaining, v_lot.quantity_remaining);

    insert into public.consumable_usage_lot_deduction
      (consumable_usage_id, lot_id, quantity_deducted)
    values (new.id, v_lot.id, v_take);

    update public.consumable_lot
      set quantity_remaining = quantity_remaining - v_take,
          is_depleted        = (quantity_remaining - v_take = 0)
      where id = v_lot.id;

    remaining := remaining - v_take;
  end loop;

  if remaining > 0 then
    raise exception 'Insufficient stock for consumable_sku_id=%: short by % unit(s)',
      new.consumable_sku_id, remaining
      using errcode = 'check_violation';
  end if;

  select * into v_sku from public.consumable_sku where id = new.consumable_sku_id;
  select coalesce(sum(quantity_remaining), 0) into v_total
    from public.consumable_lot
    where consumable_sku_id = new.consumable_sku_id
      and is_depleted = false;
  v_thresh := v_sku.low_stock_threshold;

  if v_total < v_thresh then
    perform public.notify_all_staff(
      'consumable_low_stock',
      'Low stock: ' || v_sku.name,
      v_sku.name || ' is below threshold (' || v_total || ' / ' || v_thresh || ').',
      '/staff/inventory/c/' || new.consumable_sku_id::text
    );
  end if;

  perform public.write_audit_log(
    'consumable_used', 'consumable_usage', new.id, null, to_jsonb(new)
  );

  if new.source_request_id is null then
    perform public.enqueue_notification(
      new.student_id, 'consumable_confirm', 'Consumable issued',
      'You received ' || new.quantity_used || ' ' || v_sku.unit || ' of ' || v_sku.name || '.',
      '/student/history'
    );
    perform public.enqueue_email(new.student_id, 'consumable_confirm',
      jsonb_build_object('usage_id', new.id, 'sku', v_sku.name, 'quantity', new.quantity_used));
  else
    perform public.enqueue_notification(
      new.student_id, 'consumable_approved', 'Consumable request approved',
      'Your request for ' || v_sku.name || ' was approved.',
      '/student/requests'
    );
    perform public.enqueue_email(new.student_id, 'consumable_approved',
      jsonb_build_object('usage_id', new.id, 'sku', v_sku.name, 'quantity', new.quantity_used));
  end if;

  return new;
end;
$$;

create trigger consumable_usage_after_insert
  after insert on public.consumable_usage
  for each row execute function public.tr_consumable_usage_after_insert();
