[
  {
    "schema": "public",
    "function": "calculate_call_duration",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.calculate_call_duration()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    -- Calculate duration if both start and end times are present\n    IF NEW.call_start_time IS NOT NULL AND NEW.call_end_time IS NOT NULL THEN\n        NEW.call_duration = EXTRACT(EPOCH FROM (NEW.call_end_time - NEW.call_start_time))::INTEGER;\n    END IF;\n    \n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "calculate_usage_cost",
    "args": "p_service_type character varying, p_country_code character varying, p_pricing_type character varying, p_units numeric, p_organization_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.calculate_usage_cost(p_service_type character varying, p_country_code character varying, p_pricing_type character varying, p_units numeric, p_organization_id uuid DEFAULT NULL::uuid)\n RETURNS TABLE(twilio_cost numeric, markup_amount numeric, total_cost numeric, markup_percentage numeric)\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  v_unit_cost DECIMAL(10,6);\n  v_markup DECIMAL(5,2) := 20.00;   -- default markup\nBEGIN\n  -- Built-in default voice rates (USD/min) compatible with our code paths\n  IF p_service_type ILIKE 'voice_tollfree%' THEN\n    v_unit_cost := CASE LOWER(p_pricing_type)\n      WHEN 'inbound'  THEN 0.0220\n      ELSE                0.0140\n    END;\n  ELSE\n    v_unit_cost := CASE LOWER(p_pricing_type)\n      WHEN 'inbound'  THEN 0.0085\n      ELSE                0.0140\n    END;\n  END IF;\n\n  -- Optional: override markup from billing_settings if present\n  IF p_organization_id IS NOT NULL THEN\n    BEGIN\n      SELECT default_markup_percentage INTO v_markup\n      FROM public.billing_settings\n      WHERE organization_id = p_organization_id;\n    EXCEPTION WHEN OTHERS THEN\n      -- keep default v_markup\n    END;\n  END IF;\n\n  RETURN QUERY SELECT\n    (p_units * v_unit_cost) AS twilio_cost,\n    (p_units * v_unit_cost * v_markup / 100.0) AS markup_amount,\n    (p_units * v_unit_cost * (1 + v_markup / 100.0)) AS total_cost,\n    v_markup::DECIMAL(5,2) AS markup_percentage;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "cleanup_old_notifications",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    DELETE FROM notifications \n    WHERE created_at < NOW() - INTERVAL '90 days';\n    \n    RAISE NOTICE 'Cleaned up notifications older than 90 days';\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "create_automatic_notification",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.create_automatic_notification()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    -- Only create notification if lead is assigned to an agent\n    IF NEW.assigned_to IS NOT NULL THEN\n        -- Create notification for the assigned agent\n        INSERT INTO notifications (\n            user_id,\n            organization_id,\n            title,\n            message,\n            type,\n            priority,\n            metadata,\n            read,\n            shown,\n            created_at\n        ) VALUES (\n            NEW.assigned_to,  -- Use assigned_to instead of owner_id\n            NEW.organization_id,\n            'New Lead Assigned',\n            'You have been assigned a new lead: ' || COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.company_name, 'Unknown Lead'),\n            'lead_assignment',\n            'medium',\n            jsonb_build_object(\n                'lead_id', NEW.id,\n                'lead_name', COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.company_name, 'Unknown Lead'),\n                'lead_phone', NEW.phone_number,\n                'lead_email', NEW.email\n            ),\n            false,\n            false,\n            now()\n        );\n    END IF;\n    \n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "create_organization_with_admin",
    "args": "org_name text, max_seats integer, owner_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.create_organization_with_admin(org_name text, max_seats integer, owner_id uuid)\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n  org_id UUID;\nBEGIN\n  -- Create organization\n  INSERT INTO organizations (name, max_seats, owner_id, status)\n  VALUES (org_name, max_seats, owner_id, 'pending')\n  RETURNING id INTO org_id;\n\n  -- Add owner as admin investigator\n  INSERT INTO investigators (profile_id, organization_id, role)\n  VALUES (owner_id, org_id, 'admin');\n\n  RETURN org_id;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "create_task_reminder",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.create_task_reminder()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n   BEGIN\n       -- If reminder is enabled and reminder_time is provided, create a reminder\n       IF NEW.reminder_enabled = true AND NEW.reminder_time IS NOT NULL THEN\n           -- Delete any existing reminders for this task\n           DELETE FROM task_reminders WHERE task_id = NEW.id;\n           \n           -- Create a new reminder at the specified time\n           INSERT INTO task_reminders (task_id, reminder_time, notification_type)\n           VALUES (NEW.id, NEW.reminder_time, 'browser');\n       END IF;\n       \n       RETURN NEW;\n   END;\n   $function$\n"
  },
  {
    "schema": "public",
    "function": "create_task_with_reminders",
    "args": "_owner uuid, _organization uuid, _title text, _description text, _due_at timestamp with time zone, _due_timezone text, _offsets_minutes integer[]",
    "definition": "CREATE OR REPLACE FUNCTION public.create_task_with_reminders(_owner uuid, _organization uuid, _title text, _description text, _due_at timestamp with time zone, _due_timezone text, _offsets_minutes integer[])\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\ndeclare\n  _task_id uuid := gen_random_uuid();\nbegin\n  insert into public.tasks (\n    id, title, description, status, priority, type,\n    due_date, due_timezone, owner_id, organization_id,\n    created_at, updated_at\n  ) values (\n    _task_id, _title, _description, 'pending', 'medium', 'general',\n    _due_at, _due_timezone, _owner, _organization, now(), now()\n  );\n\n  -- Build offsets = user offsets U {0}, de-duped\n  with offs as (\n    select unnest(coalesce(_offsets_minutes, '{}'))::int as o\n  ),\n  all_offs as (\n    select 0 as o\n    union\n    select distinct o from offs\n  )\n  insert into public.task_reminders (\n    id, task_id, reminder_time, status, notification_type, created_at, updated_at\n  )\n  select\n    gen_random_uuid(),\n    _task_id,\n    _due_at - make_interval(mins => o),\n    'pending',\n    'browser',\n    now(),\n    now()\n  from all_offs\n  on conflict do nothing;  -- relies on unique index above for dedupe\n\n  return _task_id;\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "deliver_due_task_reminders",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.deliver_due_task_reminders()\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\ndeclare\n  _now timestamptz := now();\nbegin\n  with due as (\n    select\n      r.id              as reminder_id,\n      r.task_id,\n      r.reminder_time,\n      t.title,\n      t.due_date,\n      t.owner_id        as user_id,\n      t.organization_id as organization_id\n    from public.task_reminders r\n    join public.tasks t on t.id = r.task_id\n    where trim(lower(r.status)) = 'pending'\n      and r.reminder_time <= _now\n    for update of r skip locked\n  ),\n  unsent as (\n    select d.*\n    from due d\n    left join public.notifications n on n.reminder_id = d.reminder_id\n    where n.reminder_id is null\n  ),\n  ins as (\n    insert into public.notifications (\n      id, user_id, organization_id, title, message, type, priority,\n      action_url, metadata, created_at, reminder_id\n    )\n    select\n      gen_random_uuid(),\n      u.user_id,\n      u.organization_id,\n      coalesce(u.title, 'Task Reminder') as title,\n\n      -- -------- friendly message (no 'overdue') --------\n      case\n        when _now >= u.due_date then\n          format('\"%s\" is due now', coalesce(u.title,'Task'))\n        else\n          case\n            when (extract(epoch from (u.due_date - u.reminder_time)) / 60)::int = 1440 then\n              format('\"%s\" is due in 1 day', coalesce(u.title,'Task'))\n            when (extract(epoch from (u.due_date - u.reminder_time)) / 3600)::int >= 2\n                 and (extract(epoch from (u.due_date - u.reminder_time)) % 3600) = 0 then\n              format('\"%s\" is due in %s hours',\n                     coalesce(u.title,'Task'),\n                     (extract(epoch from (u.due_date - u.reminder_time)) / 3600)::int)\n            when (extract(epoch from (u.due_date - u.reminder_time)) / 60)::int = 60 then\n              format('\"%s\" is due in 1 hr', coalesce(u.title,'Task'))\n            when (extract(epoch from (u.due_date - u.reminder_time)) / 60)::int in (30,15,10,5) then\n              format('\"%s\" is due in %s mins',\n                     coalesce(u.title,'Task'),\n                     (extract(epoch from (u.due_date - u.reminder_time)) / 60)::int)\n            else\n              format('\"%s\" is due soon', coalesce(u.title,'Task'))\n          end\n      end as message,\n      -- -------------------------------------------------\n\n      'task_reminder',\n      'medium',\n      null,\n      jsonb_build_object(\n        'task_id', u.task_id,\n        'reminder_time', u.reminder_time,\n        'due_date', u.due_date,\n        'offset_minutes', (extract(epoch from (u.due_date - u.reminder_time)) / 60)::int\n      ),\n      now(),\n      u.reminder_id\n    from unsent u\n    on conflict (reminder_id) where reminder_id is not null do nothing\n    returning reminder_id\n  )\n  -- Mark newly notified reminders as delivered\n  update public.task_reminders r\n  set status = 'delivered', updated_at = now()\n  where r.id in (select reminder_id from ins);\n\n  -- Self-heal: if due & pending but already had a notification, mark delivered\n  update public.task_reminders r\n  set status = 'delivered', updated_at = now()\n  where trim(lower(r.status)) = 'pending'\n    and r.reminder_time <= _now\n    and exists (select 1 from public.notifications n where n.reminder_id = r.id);\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "get_due_reminders",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.get_due_reminders()\n RETURNS TABLE(id uuid, task_id uuid, task_title text, due_date timestamp with time zone, reminder_time timestamp with time zone)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n    RETURN QUERY\n    SELECT \n        tr.id,\n        tr.task_id,\n        CAST(t.title AS TEXT) as task_title,  -- This fixes the type mismatch\n        t.due_date,\n        tr.reminder_time\n    FROM task_reminders tr\n    JOIN tasks t ON tr.task_id = t.id\n    WHERE tr.status = 'pending' \n    AND tr.reminder_time <= NOW()\n    AND t.status != 'completed';\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "handle_new_user",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.handle_new_user()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n    -- ONLY create a profile - nothing else\n    INSERT INTO public.profiles (id)\n    VALUES (NEW.id);\n    \n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "handle_task_reminders",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.handle_task_reminders()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n    -- When a task reminder is created, schedule the notification\n    IF TG_OP = 'INSERT' THEN\n        -- The reminder service will poll this table and create notifications\n        -- This trigger just ensures the reminder is properly recorded\n        RAISE NOTICE 'Task reminder scheduled for task % at %', NEW.task_id, NEW.reminder_time;\n    END IF;\n    \n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "is_organization_owner",
    "args": "org_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.is_organization_owner(org_id uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n    RETURN EXISTS (\n        SELECT 1 FROM organizations \n        WHERE id = org_id AND owner_id = auth.uid()\n    );\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "regenerate_task_reminders",
    "args": "_task_id uuid, _offsets_minutes integer[]",
    "definition": "CREATE OR REPLACE FUNCTION public.regenerate_task_reminders(_task_id uuid, _offsets_minutes integer[])\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\ndeclare\n  _due timestamptz;\nbegin\n  select due_date into _due from public.tasks where id = _task_id;\n  if _due is null then\n    raise exception 'Task % not found or has no due_date', _task_id;\n  end if;\n\n  delete from public.task_reminders\n  where task_id = _task_id\n    and trim(lower(status)) = 'pending';\n\n  insert into public.task_reminders (id, task_id, reminder_time, status, notification_type, created_at, updated_at)\n  select gen_random_uuid(), _task_id, _due - make_interval(mins => o), 'pending', 'browser', now(), now()\n  from unnest(_offsets_minutes) as o;\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "set_updated_at",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.set_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nbegin\n  new.updated_at = now();\n  return new;\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "touch_usage_overage_catalog_updated_at",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.touch_usage_overage_catalog_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  NEW.updated_at := now();\n  RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "update_call_history_updated_at",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.update_call_history_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    NEW.updated_at = NOW();\n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "update_monthly_billing",
    "args": "p_organization_id uuid, p_billing_month date",
    "definition": "CREATE OR REPLACE FUNCTION public.update_monthly_billing(p_organization_id uuid, p_billing_month date)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  v_voice_minutes DECIMAL(8,2) := 0.00;\n  v_voice_cost DECIMAL(10,2) := 0.00;\n  v_total DECIMAL(10,2) := 0.00;\nBEGIN\n  SELECT \n    COALESCE(SUM(call_duration_minutes), 0.00),\n    COALESCE(SUM(total_cost), 0.00)\n  INTO v_voice_minutes, v_voice_cost\n  FROM public.voice_usage\n  WHERE organization_id = p_organization_id\n    AND DATE_TRUNC('month', usage_date) = DATE_TRUNC('month', p_billing_month);\n\n  v_total := v_voice_cost;\n\n  INSERT INTO public.monthly_billing (\n    organization_id, billing_month, voice_minutes, voice_cost, total_cost\n  )\n  VALUES (\n    p_organization_id, p_billing_month, v_voice_minutes, v_voice_cost, v_total\n  )\n  ON CONFLICT (organization_id, billing_month) DO UPDATE\n  SET voice_minutes = EXCLUDED.voice_minutes,\n      voice_cost    = EXCLUDED.voice_cost,\n      total_cost    = EXCLUDED.total_cost,\n      updated_at    = NOW();\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "update_task_and_regenerate_reminders",
    "args": "_task_id uuid, _new_due timestamp with time zone, _offsets_minutes integer[], _title text, _description text, _priority text, _status text, _type text",
    "definition": "CREATE OR REPLACE FUNCTION public.update_task_and_regenerate_reminders(_task_id uuid, _new_due timestamp with time zone, _offsets_minutes integer[], _title text DEFAULT NULL::text, _description text DEFAULT NULL::text, _priority text DEFAULT NULL::text, _status text DEFAULT NULL::text, _type text DEFAULT NULL::text)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nbegin\n  -- 1) Update the task fields (only those provided)\n  update public.tasks\n  set\n    due_date   = coalesce(_new_due, due_date),\n    title      = coalesce(_title, title),\n    description= coalesce(_description, description),\n    priority   = coalesce(_priority, priority),\n    status     = coalesce(_status, status),\n    type       = coalesce(_type, type),\n    updated_at = now()\n  where id = _task_id;\n\n  -- 2) Remove existing *pending* reminders (keep delivered history)\n  delete from public.task_reminders\n  where task_id = _task_id\n    and trim(lower(status)) = 'pending';\n\n  -- 3) Insert fresh pending reminders from new due date\n  insert into public.task_reminders (id, task_id, reminder_time, status, notification_type, created_at, updated_at)\n  select gen_random_uuid(),\n         _task_id,\n         _new_due - make_interval(mins => o),\n         'pending',\n         'browser',\n         now(),\n         now()\n  from unnest(_offsets_minutes) as o;\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "update_task_and_regenerate_reminders",
    "args": "_task_id uuid, _new_due timestamp with time zone, _due_timezone text, _offsets_minutes integer[], _title text, _description text, _priority text, _status text, _type text",
    "definition": "CREATE OR REPLACE FUNCTION public.update_task_and_regenerate_reminders(_task_id uuid, _new_due timestamp with time zone, _due_timezone text, _offsets_minutes integer[], _title text DEFAULT NULL::text, _description text DEFAULT NULL::text, _priority text DEFAULT NULL::text, _status text DEFAULT NULL::text, _type text DEFAULT NULL::text)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nbegin\n  -- Update task metadata\n  update public.tasks\n  set\n    due_date     = coalesce(_new_due, due_date),\n    due_timezone = coalesce(_due_timezone, due_timezone),\n    title        = coalesce(_title, title),\n    description  = coalesce(_description, description),\n    priority     = coalesce(_priority, priority),\n    status       = coalesce(_status, status),\n    type         = coalesce(_type, type),\n    updated_at   = now()\n  where id = _task_id;\n\n  -- Remove existing *pending* reminders (keep delivered history)\n  delete from public.task_reminders\n  where task_id = _task_id\n    and trim(lower(status)) = 'pending';\n\n  -- Recreate reminders = user offsets U {0}, de-duped\n  with offs as (\n    select unnest(coalesce(_offsets_minutes, '{}'))::int as o\n  ),\n  all_offs as (\n    select 0 as o\n    union\n    select distinct o from offs\n  )\n  insert into public.task_reminders (\n    id, task_id, reminder_time, status, notification_type, created_at, updated_at\n  )\n  select\n    gen_random_uuid(),\n    _task_id,\n    _new_due - make_interval(mins => o),\n    'pending',\n    'browser',\n    now(),\n    now()\n  from all_offs\n  on conflict do nothing;  -- unique index prevents dup pending rows\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "update_updated_at_column",
    "args": "",
    "definition": "CREATE OR REPLACE FUNCTION public.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    NEW.updated_at = NOW();\n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "upsert_usage_wallet_auto_recharge",
    "args": "p_organization_id uuid, p_enabled boolean, p_amount_cents integer, p_threshold_cents integer, p_payment_method_id text",
    "definition": "CREATE OR REPLACE FUNCTION public.upsert_usage_wallet_auto_recharge(p_organization_id uuid, p_enabled boolean, p_amount_cents integer, p_threshold_cents integer, p_payment_method_id text DEFAULT NULL::text)\n RETURNS usage_wallet_auto_recharge\n LANGUAGE plpgsql\nAS $function$\ndeclare\n  v_row usage_wallet_auto_recharge;\nbegin\n  if p_amount_cents is null or p_amount_cents <= 0 then\n    raise exception 'INVALID_AMOUNT';\n  end if;\n\n  if p_threshold_cents is null or p_threshold_cents < 0 then\n    raise exception 'INVALID_THRESHOLD';\n  end if;\n\n  insert into usage_wallet_auto_recharge as r (\n    organization_id,\n    enabled,\n    amount_cents,\n    threshold_cents,\n    payment_method_id,\n    failed_attempts,\n    updated_at\n  ) values (\n    p_organization_id,\n    coalesce(p_enabled, false),\n    p_amount_cents,\n    p_threshold_cents,\n    p_payment_method_id,\n    0,\n    now()\n  )\n  on conflict (organization_id) do update\n    set enabled = excluded.enabled,\n        amount_cents = excluded.amount_cents,\n        threshold_cents = excluded.threshold_cents,\n        payment_method_id = excluded.payment_method_id,\n        failed_attempts = case when excluded.enabled then 0 else r.failed_attempts end,\n        last_run_at = case when excluded.enabled then r.last_run_at else null end,\n        updated_at = now()\n  returning * into v_row;\n\n  return v_row;\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "wallet_clear_pending",
    "args": "p_organization_id uuid, p_amount_cents bigint",
    "definition": "CREATE OR REPLACE FUNCTION public.wallet_clear_pending(p_organization_id uuid, p_amount_cents bigint)\n RETURNS usage_wallets\n LANGUAGE plpgsql\nAS $function$\ndeclare\n  v_wallet usage_wallets;\nbegin\n  if p_amount_cents <= 0 then\n    raise exception 'TOPUP_AMOUNT_INVALID';\n  end if;\n\n  update usage_wallets\n  set\n    pending_top_up_cents = greatest(pending_top_up_cents - p_amount_cents, 0),\n    updated_at = now()\n  where organization_id = p_organization_id\n  returning * into v_wallet;\n\n  if not found then\n    raise exception 'WALLET_NOT_FOUND';\n  end if;\n\n  update organizations\n  set updated_at = now()\n  where id = p_organization_id;\n\n  return v_wallet;\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "wallet_credit",
    "args": "p_organization_id uuid, p_amount_cents bigint, p_transaction_type text, p_reference_type text, p_reference_id text, p_description text",
    "definition": "CREATE OR REPLACE FUNCTION public.wallet_credit(p_organization_id uuid, p_amount_cents bigint, p_transaction_type text DEFAULT 'credit_top_up'::text, p_reference_type text DEFAULT NULL::text, p_reference_id text DEFAULT NULL::text, p_description text DEFAULT NULL::text)\n RETURNS usage_wallets\n LANGUAGE plpgsql\nAS $function$\ndeclare\n  v_wallet usage_wallets;\nbegin\n  if p_amount_cents <= 0 then\n    raise exception 'CREDIT_AMOUNT_INVALID';\n  end if;\n\n  update usage_wallets\n  set\n    balance_cents = balance_cents + p_amount_cents,\n    pending_top_up_cents = greatest(pending_top_up_cents - p_amount_cents, 0),\n    status = case when balance_cents + p_amount_cents > 0 then 'active' else status end,\n    last_top_up_at = now(),\n    updated_at = now()\n  where organization_id = p_organization_id\n  returning * into v_wallet;\n\n  if not found then\n    raise exception 'WALLET_NOT_FOUND';\n  end if;\n\n  insert into usage_transactions (\n    wallet_id,\n    transaction_type,\n    amount_cents,\n    post_balance_cents,\n    reference_type,\n    reference_id,\n    description,\n    created_at\n  ) values (\n    v_wallet.id,\n    coalesce(p_transaction_type, 'credit_top_up'),\n    p_amount_cents,\n    v_wallet.balance_cents,\n    p_reference_type,\n    p_reference_id,\n    p_description,\n    now()\n  );\n\n  update organizations\n  set\n    usage_wallet_status = v_wallet.status,\n    updated_at = now(),\n    initial_top_up_required = false\n  where id = p_organization_id;\n\n  return v_wallet;\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "wallet_debit",
    "args": "p_organization_id uuid, p_amount_cents bigint, p_transaction_type text, p_reference_type text, p_reference_id text, p_description text",
    "definition": "CREATE OR REPLACE FUNCTION public.wallet_debit(p_organization_id uuid, p_amount_cents bigint, p_transaction_type text DEFAULT 'debit_voice'::text, p_reference_type text DEFAULT NULL::text, p_reference_id text DEFAULT NULL::text, p_description text DEFAULT NULL::text)\n RETURNS usage_wallets\n LANGUAGE plpgsql\nAS $function$\ndeclare\n  v_wallet usage_wallets;\nbegin\n  if p_amount_cents <= 0 then\n    raise exception 'DEBIT_AMOUNT_INVALID';\n  end if;\n\n  update usage_wallets\n  set\n    balance_cents = balance_cents - p_amount_cents,\n    status = case\n      when balance_cents - p_amount_cents <= 0 then 'payment_required'\n      else status\n    end,\n    updated_at = now()\n  where organization_id = p_organization_id\n    and balance_cents >= p_amount_cents\n  returning * into v_wallet;\n\n  if not found then\n    raise exception 'INSUFFICIENT_FUNDS';\n  end if;\n\n  insert into usage_transactions (\n    wallet_id,\n    transaction_type,\n    amount_cents,\n    post_balance_cents,\n    reference_type,\n    reference_id,\n    description,\n    created_at\n  ) values (\n    v_wallet.id,\n    coalesce(p_transaction_type, 'debit_voice'),\n    -p_amount_cents,\n    v_wallet.balance_cents,\n    p_reference_type,\n    p_reference_id,\n    p_description,\n    now()\n  );\n\n  update organizations\n  set usage_wallet_status = v_wallet.status,\n      updated_at = now()\n  where id = p_organization_id;\n\n  return v_wallet;\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "wallet_get_or_create",
    "args": "p_organization_id uuid, p_threshold_cents bigint, p_top_up_amount_cents bigint",
    "definition": "CREATE OR REPLACE FUNCTION public.wallet_get_or_create(p_organization_id uuid, p_threshold_cents bigint DEFAULT 200, p_top_up_amount_cents bigint DEFAULT 1000)\n RETURNS usage_wallets\n LANGUAGE plpgsql\nAS $function$\ndeclare\n  v_wallet usage_wallets;\nbegin\n  select *\n  into v_wallet\n  from usage_wallets\n  where organization_id = p_organization_id;\n\n  if found then\n    return v_wallet;\n  end if;\n\n  insert into usage_wallets (\n    organization_id,\n    threshold_cents,\n    top_up_amount_cents,\n    currency,\n    status\n  ) values (\n    p_organization_id,\n    greatest(p_threshold_cents, 0),\n    greatest(p_top_up_amount_cents, 1000),\n    'usd',\n    'payment_required'\n  )\n  returning * into v_wallet;\n\n  update organizations\n  set\n    usage_wallet_status = v_wallet.status,\n    wallet_threshold_cents = v_wallet.threshold_cents,\n    wallet_top_up_amount_cents = v_wallet.top_up_amount_cents,\n    updated_at = now()\n  where id = p_organization_id;\n\n  return v_wallet;\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function": "wallet_mark_topup_pending",
    "args": "p_organization_id uuid, p_amount_cents bigint",
    "definition": "CREATE OR REPLACE FUNCTION public.wallet_mark_topup_pending(p_organization_id uuid, p_amount_cents bigint)\n RETURNS usage_wallets\n LANGUAGE plpgsql\nAS $function$\ndeclare\n  v_wallet usage_wallets;\nbegin\n  if p_amount_cents <= 0 then\n    raise exception 'TOPUP_AMOUNT_INVALID';\n  end if;\n\n  update usage_wallets\n  set\n    pending_top_up_cents = pending_top_up_cents + p_amount_cents,\n    updated_at = now()\n  where organization_id = p_organization_id\n  returning * into v_wallet;\n\n  if not found then\n    raise exception 'WALLET_NOT_FOUND';\n  end if;\n\n  update organizations\n  set updated_at = now()\n  where id = p_organization_id;\n\n  return v_wallet;\nend;\n$function$\n"
  }
]