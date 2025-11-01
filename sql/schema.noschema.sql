--
-- PostgreSQL database dump
--

\restrict aCkYpT1tywQTInebgJqOKtPigMHO7zyzmtKTMEXcxAprdixRcYlRgc0HDPm2xTE

-- Dumped from database version 17.4
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "auth";


--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";


--
-- Name: EXTENSION "pg_cron"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pg_cron" IS 'Job scheduler for PostgreSQL';


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "extensions";


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "graphql";


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "graphql_public";


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "pgbouncer";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "realtime";


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "storage";


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "supabase_migrations";


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "vault";


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";


--
-- Name: EXTENSION "pg_graphql"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pg_graphql" IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pg_stat_statements"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pg_stat_statements" IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pgcrypto"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


--
-- Name: EXTENSION "supabase_vault"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "supabase_vault" IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."action" AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."equality_op" AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."user_defined_filter" AS (
	"column_name" "text",
	"op" "realtime"."equality_op",
	"value" "text"
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."wal_column" AS (
	"name" "text",
	"type_name" "text",
	"type_oid" "oid",
	"value" "jsonb",
	"is_pkey" boolean,
	"is_selectable" boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE "realtime"."wal_rls" AS (
	"wal" "jsonb",
	"is_rls_enabled" boolean,
	"subscription_ids" "uuid"[],
	"errors" "text"[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION "email"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION "role"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION "uid"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."grant_pg_cron_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION "grant_pg_cron_access"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."grant_pg_cron_access"() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."grant_pg_graphql_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION "grant_pg_graphql_access"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."grant_pg_graphql_access"() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."grant_pg_net_access"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION "grant_pg_net_access"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."grant_pg_net_access"() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."pgrst_ddl_watch"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."pgrst_drop_watch"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION "extensions"."set_graphql_placeholder"() RETURNS "event_trigger"
    LANGUAGE "plpgsql"
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION "set_graphql_placeholder"(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION "extensions"."set_graphql_placeholder"() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth("text"); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION "pgbouncer"."get_auth"("p_usename" "text") RETURNS TABLE("username" "text", "password" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


--
-- Name: calculate_call_duration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."calculate_call_duration"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Calculate duration if both start and end times are present
    IF NEW.call_start_time IS NOT NULL AND NEW.call_end_time IS NOT NULL THEN
        NEW.call_duration = EXTRACT(EPOCH FROM (NEW.call_end_time - NEW.call_start_time))::INTEGER;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: calculate_usage_cost(character varying, character varying, character varying, numeric, "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."calculate_usage_cost"("p_service_type" character varying, "p_country_code" character varying, "p_pricing_type" character varying, "p_units" numeric, "p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("twilio_cost" numeric, "markup_amount" numeric, "total_cost" numeric, "markup_percentage" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_unit_cost DECIMAL(10,6);
  v_markup DECIMAL(5,2) := 20.00;   -- default markup
BEGIN
  -- Built-in default voice rates (USD/min) compatible with our code paths
  IF p_service_type ILIKE 'voice_tollfree%' THEN
    v_unit_cost := CASE LOWER(p_pricing_type)
      WHEN 'inbound'  THEN 0.0220
      ELSE                0.0140
    END;
  ELSE
    v_unit_cost := CASE LOWER(p_pricing_type)
      WHEN 'inbound'  THEN 0.0085
      ELSE                0.0140
    END;
  END IF;

  -- Optional: override markup from billing_settings if present
  IF p_organization_id IS NOT NULL THEN
    BEGIN
      SELECT default_markup_percentage INTO v_markup
      FROM public.billing_settings
      WHERE organization_id = p_organization_id;
    EXCEPTION WHEN OTHERS THEN
      -- keep default v_markup
    END;
  END IF;

  RETURN QUERY SELECT
    (p_units * v_unit_cost) AS twilio_cost,
    (p_units * v_unit_cost * v_markup / 100.0) AS markup_amount,
    (p_units * v_unit_cost * (1 + v_markup / 100.0)) AS total_cost,
    v_markup::DECIMAL(5,2) AS markup_percentage;
END;
$$;


--
-- Name: cleanup_old_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."cleanup_old_notifications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    RAISE NOTICE 'Cleaned up notifications older than 90 days';
END;
$$;


--
-- Name: create_automatic_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."create_automatic_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only create notification if lead is assigned to an agent
    IF NEW.assigned_to IS NOT NULL THEN
        -- Create notification for the assigned agent
        INSERT INTO notifications (
            user_id,
            organization_id,
            title,
            message,
            type,
            priority,
            metadata,
            read,
            shown,
            created_at
        ) VALUES (
            NEW.assigned_to,  -- Use assigned_to instead of owner_id
            NEW.organization_id,
            'New Lead Assigned',
            'You have been assigned a new lead: ' || COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.company_name, 'Unknown Lead'),
            'lead_assignment',
            'medium',
            jsonb_build_object(
                'lead_id', NEW.id,
                'lead_name', COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.company_name, 'Unknown Lead'),
                'lead_phone', NEW.phone_number,
                'lead_email', NEW.email
            ),
            false,
            false,
            now()
        );
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: create_organization_with_admin("text", integer, "uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."create_organization_with_admin"("org_name" "text", "max_seats" integer, "owner_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, max_seats, owner_id, status)
  VALUES (org_name, max_seats, owner_id, 'pending')
  RETURNING id INTO org_id;

  -- Add owner as admin investigator
  INSERT INTO investigators (profile_id, organization_id, role)
  VALUES (owner_id, org_id, 'admin');

  RETURN org_id;
END;
$$;


--
-- Name: create_task_reminder(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."create_task_reminder"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
   BEGIN
       -- If reminder is enabled and reminder_time is provided, create a reminder
       IF NEW.reminder_enabled = true AND NEW.reminder_time IS NOT NULL THEN
           -- Delete any existing reminders for this task
           DELETE FROM task_reminders WHERE task_id = NEW.id;
           
           -- Create a new reminder at the specified time
           INSERT INTO task_reminders (task_id, reminder_time, notification_type)
           VALUES (NEW.id, NEW.reminder_time, 'browser');
       END IF;
       
       RETURN NEW;
   END;
   $$;


--
-- Name: create_task_with_reminders("uuid", "uuid", "text", "text", timestamp with time zone, "text", integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."create_task_with_reminders"("_owner" "uuid", "_organization" "uuid", "_title" "text", "_description" "text", "_due_at" timestamp with time zone, "_due_timezone" "text", "_offsets_minutes" integer[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  _task_id uuid := gen_random_uuid();
begin
  insert into public.tasks (
    id, title, description, status, priority, type,
    due_date, due_timezone, owner_id, organization_id,
    created_at, updated_at
  ) values (
    _task_id, _title, _description, 'pending', 'medium', 'general',
    _due_at, _due_timezone, _owner, _organization, now(), now()
  );

  -- Build offsets = user offsets U {0}, de-duped
  with offs as (
    select unnest(coalesce(_offsets_minutes, '{}'))::int as o
  ),
  all_offs as (
    select 0 as o
    union
    select distinct o from offs
  )
  insert into public.task_reminders (
    id, task_id, reminder_time, status, notification_type, created_at, updated_at
  )
  select
    gen_random_uuid(),
    _task_id,
    _due_at - make_interval(mins => o),
    'pending',
    'browser',
    now(),
    now()
  from all_offs
  on conflict do nothing;  -- relies on unique index above for dedupe

  return _task_id;
end;
$$;


--
-- Name: deliver_due_task_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."deliver_due_task_reminders"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  _now timestamptz := now();
begin
  with due as (
    select
      r.id              as reminder_id,
      r.task_id,
      r.reminder_time,
      t.title,
      t.due_date,
      t.owner_id        as user_id,
      t.organization_id as organization_id
    from public.task_reminders r
    join public.tasks t on t.id = r.task_id
    where trim(lower(r.status)) = 'pending'
      and r.reminder_time <= _now
    for update of r skip locked
  ),
  unsent as (
    select d.*
    from due d
    left join public.notifications n on n.reminder_id = d.reminder_id
    where n.reminder_id is null
  ),
  ins as (
    insert into public.notifications (
      id, user_id, organization_id, title, message, type, priority,
      action_url, metadata, created_at, reminder_id
    )
    select
      gen_random_uuid(),
      u.user_id,
      u.organization_id,
      coalesce(u.title, 'Task Reminder') as title,

      -- -------- friendly message (no 'overdue') --------
      case
        when _now >= u.due_date then
          format('"%s" is due now', coalesce(u.title,'Task'))
        else
          case
            when (extract(epoch from (u.due_date - u.reminder_time)) / 60)::int = 1440 then
              format('"%s" is due in 1 day', coalesce(u.title,'Task'))
            when (extract(epoch from (u.due_date - u.reminder_time)) / 3600)::int >= 2
                 and (extract(epoch from (u.due_date - u.reminder_time)) % 3600) = 0 then
              format('"%s" is due in %s hours',
                     coalesce(u.title,'Task'),
                     (extract(epoch from (u.due_date - u.reminder_time)) / 3600)::int)
            when (extract(epoch from (u.due_date - u.reminder_time)) / 60)::int = 60 then
              format('"%s" is due in 1 hr', coalesce(u.title,'Task'))
            when (extract(epoch from (u.due_date - u.reminder_time)) / 60)::int in (30,15,10,5) then
              format('"%s" is due in %s mins',
                     coalesce(u.title,'Task'),
                     (extract(epoch from (u.due_date - u.reminder_time)) / 60)::int)
            else
              format('"%s" is due soon', coalesce(u.title,'Task'))
          end
      end as message,
      -- -------------------------------------------------

      'task_reminder',
      'medium',
      null,
      jsonb_build_object(
        'task_id', u.task_id,
        'reminder_time', u.reminder_time,
        'due_date', u.due_date,
        'offset_minutes', (extract(epoch from (u.due_date - u.reminder_time)) / 60)::int
      ),
      now(),
      u.reminder_id
    from unsent u
    on conflict (reminder_id) where reminder_id is not null do nothing
    returning reminder_id
  )
  -- Mark newly notified reminders as delivered
  update public.task_reminders r
  set status = 'delivered', updated_at = now()
  where r.id in (select reminder_id from ins);

  -- Self-heal: if due & pending but already had a notification, mark delivered
  update public.task_reminders r
  set status = 'delivered', updated_at = now()
  where trim(lower(r.status)) = 'pending'
    and r.reminder_time <= _now
    and exists (select 1 from public.notifications n where n.reminder_id = r.id);
end;
$$;


--
-- Name: get_due_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_due_reminders"() RETURNS TABLE("id" "uuid", "task_id" "uuid", "task_title" "text", "due_date" timestamp with time zone, "reminder_time" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id,
        tr.task_id,
        CAST(t.title AS TEXT) as task_title,  -- This fixes the type mismatch
        t.due_date,
        tr.reminder_time
    FROM task_reminders tr
    JOIN tasks t ON tr.task_id = t.id
    WHERE tr.status = 'pending' 
    AND tr.reminder_time <= NOW()
    AND t.status != 'completed';
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- ONLY create a profile - nothing else
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;


--
-- Name: handle_task_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_task_reminders"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- When a task reminder is created, schedule the notification
    IF TG_OP = 'INSERT' THEN
        -- The reminder service will poll this table and create notifications
        -- This trigger just ensures the reminder is properly recorded
        RAISE NOTICE 'Task reminder scheduled for task % at %', NEW.task_id, NEW.reminder_time;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: is_organization_owner("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_organization_owner"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organizations 
        WHERE id = org_id AND owner_id = auth.uid()
    );
END;
$$;


--
-- Name: regenerate_task_reminders("uuid", integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."regenerate_task_reminders"("_task_id" "uuid", "_offsets_minutes" integer[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  _due timestamptz;
begin
  select due_date into _due from public.tasks where id = _task_id;
  if _due is null then
    raise exception 'Task % not found or has no due_date', _task_id;
  end if;

  delete from public.task_reminders
  where task_id = _task_id
    and trim(lower(status)) = 'pending';

  insert into public.task_reminders (id, task_id, reminder_time, status, notification_type, created_at, updated_at)
  select gen_random_uuid(), _task_id, _due - make_interval(mins => o), 'pending', 'browser', now(), now()
  from unnest(_offsets_minutes) as o;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: touch_usage_overage_catalog_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."touch_usage_overage_catalog_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: update_call_history_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_call_history_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_monthly_billing("uuid", "date"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_monthly_billing"("p_organization_id" "uuid", "p_billing_month" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_voice_minutes DECIMAL(8,2) := 0.00;
  v_voice_cost DECIMAL(10,2) := 0.00;
  v_total DECIMAL(10,2) := 0.00;
BEGIN
  SELECT 
    COALESCE(SUM(call_duration_minutes), 0.00),
    COALESCE(SUM(total_cost), 0.00)
  INTO v_voice_minutes, v_voice_cost
  FROM public.voice_usage
  WHERE organization_id = p_organization_id
    AND DATE_TRUNC('month', usage_date) = DATE_TRUNC('month', p_billing_month);

  v_total := v_voice_cost;

  INSERT INTO public.monthly_billing (
    organization_id, billing_month, voice_minutes, voice_cost, total_cost
  )
  VALUES (
    p_organization_id, p_billing_month, v_voice_minutes, v_voice_cost, v_total
  )
  ON CONFLICT (organization_id, billing_month) DO UPDATE
  SET voice_minutes = EXCLUDED.voice_minutes,
      voice_cost    = EXCLUDED.voice_cost,
      total_cost    = EXCLUDED.total_cost,
      updated_at    = NOW();
END;
$$;


--
-- Name: update_task_and_regenerate_reminders("uuid", timestamp with time zone, integer[], "text", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_task_and_regenerate_reminders"("_task_id" "uuid", "_new_due" timestamp with time zone, "_offsets_minutes" integer[], "_title" "text" DEFAULT NULL::"text", "_description" "text" DEFAULT NULL::"text", "_priority" "text" DEFAULT NULL::"text", "_status" "text" DEFAULT NULL::"text", "_type" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- 1) Update the task fields (only those provided)
  update public.tasks
  set
    due_date   = coalesce(_new_due, due_date),
    title      = coalesce(_title, title),
    description= coalesce(_description, description),
    priority   = coalesce(_priority, priority),
    status     = coalesce(_status, status),
    type       = coalesce(_type, type),
    updated_at = now()
  where id = _task_id;

  -- 2) Remove existing *pending* reminders (keep delivered history)
  delete from public.task_reminders
  where task_id = _task_id
    and trim(lower(status)) = 'pending';

  -- 3) Insert fresh pending reminders from new due date
  insert into public.task_reminders (id, task_id, reminder_time, status, notification_type, created_at, updated_at)
  select gen_random_uuid(),
         _task_id,
         _new_due - make_interval(mins => o),
         'pending',
         'browser',
         now(),
         now()
  from unnest(_offsets_minutes) as o;
end;
$$;


--
-- Name: update_task_and_regenerate_reminders("uuid", timestamp with time zone, "text", integer[], "text", "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_task_and_regenerate_reminders"("_task_id" "uuid", "_new_due" timestamp with time zone, "_due_timezone" "text", "_offsets_minutes" integer[], "_title" "text" DEFAULT NULL::"text", "_description" "text" DEFAULT NULL::"text", "_priority" "text" DEFAULT NULL::"text", "_status" "text" DEFAULT NULL::"text", "_type" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Update task metadata
  update public.tasks
  set
    due_date     = coalesce(_new_due, due_date),
    due_timezone = coalesce(_due_timezone, due_timezone),
    title        = coalesce(_title, title),
    description  = coalesce(_description, description),
    priority     = coalesce(_priority, priority),
    status       = coalesce(_status, status),
    type         = coalesce(_type, type),
    updated_at   = now()
  where id = _task_id;

  -- Remove existing *pending* reminders (keep delivered history)
  delete from public.task_reminders
  where task_id = _task_id
    and trim(lower(status)) = 'pending';

  -- Recreate reminders = user offsets U {0}, de-duped
  with offs as (
    select unnest(coalesce(_offsets_minutes, '{}'))::int as o
  ),
  all_offs as (
    select 0 as o
    union
    select distinct o from offs
  )
  insert into public.task_reminders (
    id, task_id, reminder_time, status, notification_type, created_at, updated_at
  )
  select
    gen_random_uuid(),
    _task_id,
    _new_due - make_interval(mins => o),
    'pending',
    'browser',
    now(),
    now()
  from all_offs
  on conflict do nothing;  -- unique index prevents dup pending rows
end;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: usage_wallet_auto_recharge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."usage_wallet_auto_recharge" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "amount_cents" integer NOT NULL,
    "threshold_cents" integer NOT NULL,
    "payment_method_id" "text",
    "last_run_at" timestamp with time zone,
    "failed_attempts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: upsert_usage_wallet_auto_recharge("uuid", boolean, integer, integer, "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."upsert_usage_wallet_auto_recharge"("p_organization_id" "uuid", "p_enabled" boolean, "p_amount_cents" integer, "p_threshold_cents" integer, "p_payment_method_id" "text" DEFAULT NULL::"text") RETURNS "public"."usage_wallet_auto_recharge"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_row usage_wallet_auto_recharge;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_threshold_cents is null or p_threshold_cents < 0 then
    raise exception 'INVALID_THRESHOLD';
  end if;

  insert into usage_wallet_auto_recharge as r (
    organization_id,
    enabled,
    amount_cents,
    threshold_cents,
    payment_method_id,
    failed_attempts,
    updated_at
  ) values (
    p_organization_id,
    coalesce(p_enabled, false),
    p_amount_cents,
    p_threshold_cents,
    p_payment_method_id,
    0,
    now()
  )
  on conflict (organization_id) do update
    set enabled = excluded.enabled,
        amount_cents = excluded.amount_cents,
        threshold_cents = excluded.threshold_cents,
        payment_method_id = excluded.payment_method_id,
        failed_attempts = case when excluded.enabled then 0 else r.failed_attempts end,
        last_run_at = case when excluded.enabled then r.last_run_at else null end,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;


--
-- Name: wallet_auto_recharge_result("text", "text", integer, "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."wallet_auto_recharge_result"("p_payment_intent_id" "text", "p_status" "text", "p_amount_cents" integer, "p_failure_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id
    INTO v_org_id
    FROM usage_topups
   WHERE stripe_payment_intent_id = p_payment_intent_id
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO usage_wallet_auto_recharge_events (
    organization_id,
    payment_intent_id,
    status,
    amount_cents,
    failure_reason
  ) VALUES (
    v_org_id,
    p_payment_intent_id,
    p_status,
    p_amount_cents,
    p_failure_reason
  );
END;
$$;


--
-- Name: usage_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."usage_wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "balance_cents" bigint DEFAULT 0 NOT NULL,
    "threshold_cents" bigint DEFAULT 200 NOT NULL,
    "top_up_amount_cents" bigint DEFAULT 1000 NOT NULL,
    "pending_top_up_cents" bigint DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'payment_required'::"text" NOT NULL,
    "last_top_up_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "usage_wallets_balance_cents_check" CHECK (("balance_cents" >= 0)),
    CONSTRAINT "usage_wallets_pending_top_up_cents_check" CHECK (("pending_top_up_cents" >= 0)),
    CONSTRAINT "usage_wallets_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'payment_required'::"text", 'suspended'::"text"]))),
    CONSTRAINT "usage_wallets_threshold_cents_check" CHECK (("threshold_cents" >= 0)),
    CONSTRAINT "usage_wallets_top_up_amount_cents_check" CHECK (("top_up_amount_cents" >= 1000))
);


--
-- Name: wallet_clear_pending("uuid", bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."wallet_clear_pending"("p_organization_id" "uuid", "p_amount_cents" bigint) RETURNS "public"."usage_wallets"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_wallet usage_wallets;
begin
  if p_amount_cents <= 0 then
    raise exception 'TOPUP_AMOUNT_INVALID';
  end if;

  update usage_wallets
  set
    pending_top_up_cents = greatest(pending_top_up_cents - p_amount_cents, 0),
    updated_at = now()
  where organization_id = p_organization_id
  returning * into v_wallet;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  update organizations
  set updated_at = now()
  where id = p_organization_id;

  return v_wallet;
end;
$$;


--
-- Name: wallet_credit("uuid", bigint, "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."wallet_credit"("p_organization_id" "uuid", "p_amount_cents" bigint, "p_transaction_type" "text" DEFAULT 'credit_top_up'::"text", "p_reference_type" "text" DEFAULT NULL::"text", "p_reference_id" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text") RETURNS "public"."usage_wallets"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_wallet usage_wallets;
begin
  if p_amount_cents <= 0 then
    raise exception 'CREDIT_AMOUNT_INVALID';
  end if;

  update usage_wallets
  set
    balance_cents = balance_cents + p_amount_cents,
    pending_top_up_cents = greatest(pending_top_up_cents - p_amount_cents, 0),
    status = case when balance_cents + p_amount_cents > 0 then 'active' else status end,
    last_top_up_at = now(),
    updated_at = now()
  where organization_id = p_organization_id
  returning * into v_wallet;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  insert into usage_transactions (
    wallet_id,
    transaction_type,
    amount_cents,
    post_balance_cents,
    reference_type,
    reference_id,
    description,
    created_at
  ) values (
    v_wallet.id,
    coalesce(p_transaction_type, 'credit_top_up'),
    p_amount_cents,
    v_wallet.balance_cents,
    p_reference_type,
    p_reference_id,
    p_description,
    now()
  );

  update organizations
  set
    usage_wallet_status = v_wallet.status,
    updated_at = now(),
    initial_top_up_required = false
  where id = p_organization_id;

  return v_wallet;
end;
$$;


--
-- Name: wallet_debit("uuid", bigint, "text", "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."wallet_debit"("p_organization_id" "uuid", "p_amount_cents" bigint, "p_transaction_type" "text" DEFAULT 'debit_voice'::"text", "p_reference_type" "text" DEFAULT NULL::"text", "p_reference_id" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text") RETURNS "public"."usage_wallets"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_wallet usage_wallets;
begin
  if p_amount_cents <= 0 then
    raise exception 'DEBIT_AMOUNT_INVALID';
  end if;

  update usage_wallets
  set
    balance_cents = balance_cents - p_amount_cents,
    status = case
      when balance_cents - p_amount_cents <= 0 then 'payment_required'
      else status
    end,
    updated_at = now()
  where organization_id = p_organization_id
    and balance_cents >= p_amount_cents
  returning * into v_wallet;

  if not found then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  insert into usage_transactions (
    wallet_id,
    transaction_type,
    amount_cents,
    post_balance_cents,
    reference_type,
    reference_id,
    description,
    created_at
  ) values (
    v_wallet.id,
    coalesce(p_transaction_type, 'debit_voice'),
    -p_amount_cents,
    v_wallet.balance_cents,
    p_reference_type,
    p_reference_id,
    p_description,
    now()
  );

  update organizations
  set usage_wallet_status = v_wallet.status,
      updated_at = now()
  where id = p_organization_id;

  return v_wallet;
end;
$$;


--
-- Name: wallet_get_or_create("uuid", bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."wallet_get_or_create"("p_organization_id" "uuid", "p_threshold_cents" bigint DEFAULT 200, "p_top_up_amount_cents" bigint DEFAULT 1000) RETURNS "public"."usage_wallets"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_wallet usage_wallets;
begin
  select *
  into v_wallet
  from usage_wallets
  where organization_id = p_organization_id;

  if found then
    return v_wallet;
  end if;

  insert into usage_wallets (
    organization_id,
    threshold_cents,
    top_up_amount_cents,
    currency,
    status
  ) values (
    p_organization_id,
    greatest(p_threshold_cents, 0),
    greatest(p_top_up_amount_cents, 1000),
    'usd',
    'payment_required'
  )
  returning * into v_wallet;

  update organizations
  set
    usage_wallet_status = v_wallet.status,
    wallet_threshold_cents = v_wallet.threshold_cents,
    wallet_top_up_amount_cents = v_wallet.top_up_amount_cents,
    updated_at = now()
  where id = p_organization_id;

  return v_wallet;
end;
$$;


--
-- Name: wallet_mark_topup_pending("uuid", bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."wallet_mark_topup_pending"("p_organization_id" "uuid", "p_amount_cents" bigint) RETURNS "public"."usage_wallets"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_wallet usage_wallets;
begin
  if p_amount_cents <= 0 then
    raise exception 'TOPUP_AMOUNT_INVALID';
  end if;

  update usage_wallets
  set
    pending_top_up_cents = pending_top_up_cents + p_amount_cents,
    updated_at = now()
  where organization_id = p_organization_id
  returning * into v_wallet;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  update organizations
  set updated_at = now()
  where id = p_organization_id;

  return v_wallet;
end;
$$;


--
-- Name: apply_rls("jsonb", integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."apply_rls"("wal" "jsonb", "max_record_bytes" integer DEFAULT (1024 * 1024)) RETURNS SETOF "realtime"."wal_rls"
    LANGUAGE "plpgsql"
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes("text", "text", "text", "text", "text", "record", "record", "text"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."broadcast_changes"("topic_name" "text", "event_name" "text", "operation" "text", "table_name" "text", "table_schema" "text", "new" "record", "old" "record", "level" "text" DEFAULT 'ROW'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql("text", "regclass", "realtime"."wal_column"[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."build_prepared_statement_sql"("prepared_statement_name" "text", "entity" "regclass", "columns" "realtime"."wal_column"[]) RETURNS "text"
    LANGUAGE "sql"
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast("text", "regtype"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."cast"("val" "text", "type_" "regtype") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op("realtime"."equality_op", "regtype", "text", "text"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."check_equality_op"("op" "realtime"."equality_op", "type_" "regtype", "val_1" "text", "val_2" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters("realtime"."wal_column"[], "realtime"."user_defined_filter"[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."is_visible_through_filters"("columns" "realtime"."wal_column"[], "filters" "realtime"."user_defined_filter"[]) RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes("name", "name", integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."list_changes"("publication" "name", "slot_name" "name", "max_changes" integer, "max_record_bytes" integer) RETURNS SETOF "realtime"."wal_rls"
    LANGUAGE "sql"
    SET "log_min_messages" TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json("regclass"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."quote_wal2json"("entity" "regclass") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send("jsonb", "text", "text", boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."send"("payload" "jsonb", "event" "text", "topic" "text", "private" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."subscription_check_filters"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole("text"); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."to_regrole"("role_name" "text") RETURNS "regrole"
    LANGUAGE "sql" IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION "realtime"."topic"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: add_prefixes("text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


--
-- Name: can_insert_object("text", "text", "uuid", "jsonb"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: delete_leaf_prefixes("text"[], "text"[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


--
-- Name: delete_prefix("text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."delete_prefix_hierarchy_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_level("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."get_level"("name" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."get_prefix"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


--
-- Name: get_prefixes("text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."get_prefixes"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter("text", "text", "text", integer, "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter("text", "text", "text", integer, "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: lock_top_prefixes("text"[], "text"[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."objects_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."objects_insert_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."objects_update_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."objects_update_level_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."objects_update_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."prefixes_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."prefixes_insert_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


--
-- Name: search("text", "text", integer, integer, integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


--
-- Name: search_legacy_v1("text", "text", integer, integer, integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v1_optimised("text", "text", integer, integer, integer, "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v2("text", "text", integer, integer, "text", "text", "text", "text"); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE "audit_log_entries"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text" NOT NULL,
    "code_challenge_method" "auth"."code_challenge_method" NOT NULL,
    "code_challenge" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone
);


--
-- Name: TABLE "flow_state"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."flow_state" IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: TABLE "identities"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN "identities"."email"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


--
-- Name: TABLE "instances"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


--
-- Name: TABLE "mfa_amr_claims"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


--
-- Name: TABLE "mfa_challenges"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid"
);


--
-- Name: TABLE "mfa_factors"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


--
-- Name: TABLE "refresh_tokens"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


--
-- Name: TABLE "saml_providers"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


--
-- Name: TABLE "saml_relay_states"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


--
-- Name: TABLE "schema_migrations"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid"
);


--
-- Name: TABLE "sessions"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN "sessions"."not_after"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


--
-- Name: TABLE "sso_domains"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


--
-- Name: TABLE "sso_providers"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN "sso_providers"."resource_id"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


--
-- Name: TABLE "users"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN "users"."is_sso_user"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: addon_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."addon_catalog" (
    "addon_code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "unit" "text",
    "price_cents" integer NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "billing_mode" "text" NOT NULL
);


--
-- Name: agent_phone_numbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."agent_phone_numbers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "phone_number" "text" NOT NULL,
    "twilio_sid" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: billing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."billing_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "default_markup_percentage" numeric(5,2) DEFAULT 20.00 NOT NULL,
    "billing_cycle" character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    "auto_billing" boolean DEFAULT true NOT NULL,
    "billing_email" character varying(255),
    "payment_method" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: call_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."call_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "twilio_call_sid" character varying(255) NOT NULL,
    "call_direction" character varying(10) NOT NULL,
    "from_number" character varying(20) NOT NULL,
    "to_number" character varying(20) NOT NULL,
    "agent_id" "uuid",
    "organization_id" "uuid",
    "lead_id" "uuid",
    "call_status" character varying(20) DEFAULT 'initiated'::character varying NOT NULL,
    "call_duration" integer DEFAULT 0,
    "call_start_time" timestamp with time zone,
    "call_end_time" timestamp with time zone,
    "call_quality_score" numeric(3,2),
    "recording_url" "text",
    "recording_duration" integer,
    "twilio_price" numeric(10,4),
    "twilio_price_unit" character varying(3) DEFAULT 'USD'::character varying,
    "call_notes" "text",
    "call_tags" "text"[],
    "call_outcome" character varying(20),
    "follow_up_required" boolean DEFAULT false,
    "follow_up_date" "date",
    "follow_up_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_billed_seconds" integer DEFAULT 0,
    "last_usage_check_at" timestamp with time zone,
    "forced_disconnect_reason" "text",
    CONSTRAINT "call_history_call_direction_check" CHECK ((("call_direction")::"text" = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::"text"[]))),
    CONSTRAINT "call_history_call_outcome_check" CHECK ((("call_outcome")::"text" = ANY ((ARRAY['successful'::character varying, 'no-answer'::character varying, 'busy'::character varying, 'failed'::character varying, 'voicemail'::character varying, 'callback-requested'::character varying, 'not-interested'::character varying])::"text"[]))),
    CONSTRAINT "call_history_call_status_check" CHECK ((("call_status")::"text" = ANY ((ARRAY['initiated'::character varying, 'ringing'::character varying, 'answered'::character varying, 'completed'::character varying, 'busy'::character varying, 'no-answer'::character varying, 'failed'::character varying, 'canceled'::character varying])::"text"[])))
);


--
-- Name: TABLE "call_history"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."call_history" IS 'Stores complete call history with Twilio integration';


--
-- Name: COLUMN "call_history"."twilio_call_sid"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."call_history"."twilio_call_sid" IS 'Unique Twilio Call SID for webhook integration';


--
-- Name: COLUMN "call_history"."call_direction"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."call_history"."call_direction" IS 'inbound or outbound call direction';


--
-- Name: COLUMN "call_history"."call_status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."call_history"."call_status" IS 'Current status of the call from Twilio';


--
-- Name: COLUMN "call_history"."call_duration"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."call_history"."call_duration" IS 'Call duration in seconds, calculated automatically';


--
-- Name: COLUMN "call_history"."call_quality_score"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."call_history"."call_quality_score" IS 'Call quality rating from 0.00 to 5.00';


--
-- Name: COLUMN "call_history"."call_outcome"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."call_history"."call_outcome" IS 'Business outcome of the call';


--
-- Name: COLUMN "call_history"."follow_up_required"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."call_history"."follow_up_required" IS 'Whether a follow-up call is needed';


--
-- Name: call_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."call_statistics" AS
 SELECT "organization_id",
    "agent_id",
    "date"("call_start_time") AS "call_date",
    "call_direction",
    "call_status",
    "call_outcome",
    "count"(*) AS "total_calls",
    "avg"("call_duration") AS "avg_duration",
    "sum"("call_duration") AS "total_duration",
    "count"(
        CASE
            WHEN (("call_status")::"text" = 'completed'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completed_calls",
    "count"(
        CASE
            WHEN (("call_outcome")::"text" = 'successful'::"text") THEN 1
            ELSE NULL::integer
        END) AS "successful_calls"
   FROM "public"."call_history"
  WHERE ("call_start_time" IS NOT NULL)
  GROUP BY "organization_id", "agent_id", ("date"("call_start_time")), "call_direction", "call_status", "call_outcome";


--
-- Name: communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."communications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "direction" character varying(50) NOT NULL,
    "subject" character varying(500),
    "content" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "duration" integer,
    "status" character varying(50) DEFAULT 'sent'::character varying,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "user_id" "uuid",
    CONSTRAINT "communications_direction_check" CHECK ((("direction")::"text" = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::"text"[]))),
    CONSTRAINT "communications_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['sent'::character varying, 'delivered'::character varying, 'read'::character varying, 'failed'::character varying])::"text"[]))),
    CONSTRAINT "communications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['email'::character varying, 'text'::character varying, 'call'::character varying])::"text"[])))
);


--
-- Name: invoice_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."invoice_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "stripe_invoice_id" "text",
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "items" "jsonb",
    "subtotal_cents" integer,
    "tax_cents" integer,
    "total_cents" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(50),
    "company" character varying(255),
    "stage" character varying(50) DEFAULT 'new'::character varying NOT NULL,
    "value" numeric(15,2) DEFAULT 0,
    "title" character varying(500),
    "description" "text",
    "category" character varying(100),
    "status" character varying(50) DEFAULT 'active'::character varying,
    "priority" character varying(50) DEFAULT 'low'::character varying,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "last_contact" "date",
    "notes" "text",
    "organization_id" "uuid",
    "assigned_to" "uuid",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "leads_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[]))),
    CONSTRAINT "leads_stage_check" CHECK ((("stage")::"text" = ANY ((ARRAY['new'::character varying, 'contacted'::character varying, 'qualified'::character varying, 'proposal'::character varying, 'closed-won'::character varying, 'closed-lost'::character varying])::"text"[]))),
    CONSTRAINT "leads_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'in_progress'::character varying, 'closed'::character varying])::"text"[])))
);


--
-- Name: monthly_billing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."monthly_billing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "billing_month" "date" NOT NULL,
    "voice_minutes" numeric(8,2) DEFAULT 0.00 NOT NULL,
    "voice_cost" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_cost" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "currency" character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "invoice_number" character varying(100),
    "due_date" "date",
    "paid_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "title" "text",
    "message" "text",
    "type" "text" DEFAULT 'general'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "action_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone,
    "reminder_id" "uuid",
    "shown" boolean
);

ALTER TABLE ONLY "public"."notifications" REPLICA IDENTITY FULL;


--
-- Name: org_suspensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."org_suspensions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "reason" "text",
    "requested_by" "uuid",
    "effective_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone
);


--
-- Name: organization_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."organization_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "role" character varying(50) NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    CONSTRAINT "organization_invites_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'expired'::character varying, 'cancelled'::character varying])::"text"[])))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "max_seats" integer DEFAULT 10,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "website" "text",
    "industry" "text",
    "ein" "text",
    "address_street" "text",
    "address_city" "text",
    "address_state" "text",
    "address_zip" "text",
    "address_country" "text",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_status" "text",
    "org_status" "text" DEFAULT 'active'::"text",
    "plan_code" "text" DEFAULT 'starter'::"text",
    "plan_price_cents" integer DEFAULT 12900,
    "included_seats" integer DEFAULT 1,
    "included_minutes" integer DEFAULT 500,
    "included_sms" integer DEFAULT 200,
    "included_emails" integer DEFAULT 1000,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "twilio_subaccount_sid" "text",
    "vapi_assistant_id" "text",
    "tz" "text" DEFAULT 'America/New_York'::"text",
    "trusthub_profile_sid" "text",
    "a2p_campaign_id" "text",
    "a2p_campaign_status" "text",
    "a2p_campaign_reject_reason" "text",
    "tollfree_verification_status" "text",
    "tollfree_reject_reason" "text",
    "trial_ending_soon" boolean DEFAULT false,
    "cancel_at_period_end" boolean,
    "stripe_collection_method" "text",
    "stripe_latest_invoice_id" "text",
    "stripe_latest_invoice_status" "text",
    "stripe_default_payment_method_id" "text",
    "stripe_subscription_status_reason" "text",
    "stripe_pause_collection" "jsonb",
    "stripe_subscription_metadata" "jsonb",
    "payment_action_required" boolean DEFAULT false,
    "payment_retry_count" integer DEFAULT 0,
    "next_payment_retry_at" timestamp with time zone,
    "last_payment_failed_at" timestamp with time zone,
    "payment_failure_reason" "text",
    "dunning_enabled" boolean DEFAULT false,
    "messaging_service_sid" "text",
    "twilio_messaging_service_sid" "text",
    "twilio_twiml_app_sid" "text",
    "twilio_api_key_sid" "text",
    "twilio_api_key_secret" "text",
    "usage_wallet_status" "text" DEFAULT 'payment_required'::"text" NOT NULL,
    "wallet_threshold_cents" bigint DEFAULT 200 NOT NULL,
    "wallet_top_up_amount_cents" bigint DEFAULT 1000 NOT NULL,
    "initial_top_up_required" boolean DEFAULT true NOT NULL,
    "preferred_area_code" bigint,
    CONSTRAINT "organizations_usage_wallet_status_check" CHECK (("usage_wallet_status" = ANY (ARRAY['active'::"text", 'payment_required'::"text", 'suspended'::"text"]))),
    CONSTRAINT "organizations_wallet_threshold_cents_check" CHECK (("wallet_threshold_cents" >= 0)),
    CONSTRAINT "organizations_wallet_top_up_amount_cents_check" CHECK (("wallet_top_up_amount_cents" >= 1000))
);


--
-- Name: COLUMN "organizations"."current_period_start"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."current_period_start" IS 'Stripe subscription.current_period_start (UTC).';


--
-- Name: COLUMN "organizations"."current_period_end"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."current_period_end" IS 'Stripe subscription.current_period_end (UTC).';


--
-- Name: COLUMN "organizations"."trial_ending_soon"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."trial_ending_soon" IS 'Set when Stripe notifies us a trial is ending; cleared once the trial ends.';


--
-- Name: COLUMN "organizations"."cancel_at_period_end"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."cancel_at_period_end" IS 'Reflects Stripe subscription.cancel_at_period_end.';


--
-- Name: COLUMN "organizations"."stripe_collection_method"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."stripe_collection_method" IS 'Stripe subscription collection_method.';


--
-- Name: COLUMN "organizations"."stripe_latest_invoice_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."stripe_latest_invoice_id" IS 'Latest Stripe invoice id linked to this subscription.';


--
-- Name: COLUMN "organizations"."stripe_latest_invoice_status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."stripe_latest_invoice_status" IS 'Status of the latest Stripe invoice (draft/open/paid/uncollectible/void).';


--
-- Name: COLUMN "organizations"."stripe_default_payment_method_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."stripe_default_payment_method_id" IS 'Payment method saved on the customer/subscription.';


--
-- Name: COLUMN "organizations"."stripe_subscription_status_reason"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."stripe_subscription_status_reason" IS 'Stripe status reason (paused, past_due, unpaid, etc).';


--
-- Name: COLUMN "organizations"."stripe_pause_collection"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."stripe_pause_collection" IS 'Raw pause_collection object from Stripe (if set).';


--
-- Name: COLUMN "organizations"."stripe_subscription_metadata"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."stripe_subscription_metadata" IS 'Full Stripe subscription metadata snapshot for support/debugging.';


--
-- Name: COLUMN "organizations"."payment_retry_count"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."payment_retry_count" IS 'Number of times we retried a failed payment.';


--
-- Name: COLUMN "organizations"."next_payment_retry_at"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."next_payment_retry_at" IS 'Next scheduled payment retry timestamp.';


--
-- Name: COLUMN "organizations"."last_payment_failed_at"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."last_payment_failed_at" IS 'Timestamp of the last failed payment attempt.';


--
-- Name: COLUMN "organizations"."payment_failure_reason"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."payment_failure_reason" IS 'Stripe error message or failure reason.';


--
-- Name: COLUMN "organizations"."dunning_enabled"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."organizations"."dunning_enabled" IS 'Set when we enable dunning/pause collection at Stripe.';


--
-- Name: payment_failure_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."payment_failure_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "stripe_invoice_id" "text",
    "error_message" "text",
    "retry_count" integer,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raw_payload" "jsonb"
);


--
-- Name: phone_numbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."phone_numbers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "seat_id" "uuid",
    "sid" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "capabilities" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "voice_webhook_url" "text",
    "sms_webhook_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: plan_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."plan_catalog" (
    "plan_code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "base_price_cents" integer NOT NULL,
    "included_seats" integer NOT NULL,
    "included_minutes" integer NOT NULL,
    "included_sms" integer NOT NULL,
    "included_emails" integer NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true,
    "env" "text" DEFAULT 'test'::"text",
    "description" "text",
    CONSTRAINT "plan_catalog_env_check" CHECK (("env" = ANY (ARRAY['test'::"text", 'live'::"text"])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "completed_onboarding" boolean,
    "avatar" "text",
    "title" "text" DEFAULT ''::"text",
    "bio" "text" DEFAULT ''::"text",
    "phone" "text" DEFAULT ''::"text",
    "location" "text" DEFAULT ''::"text"
);


--
-- Name: seat_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."seat_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "seat_id" "uuid",
    "action" "text" NOT NULL,
    "reason" "text",
    "delta" integer NOT NULL,
    "stripe_item_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."seats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "phone_sid" "text",
    "phone_e164" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: sms_brand_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."sms_brand_profile" (
    "org_id" "uuid" NOT NULL,
    "legal_name" "text" NOT NULL,
    "business_type" "text" NOT NULL,
    "ein" "text" NOT NULL,
    "website" "text" NOT NULL,
    "industry" "text" NOT NULL,
    "addr_street" "text" NOT NULL,
    "addr_city" "text" NOT NULL,
    "addr_state" "text" NOT NULL,
    "addr_zip" "text" NOT NULL,
    "addr_country" "text" NOT NULL,
    "contact_name" "text" NOT NULL,
    "contact_email" "text" NOT NULL,
    "contact_phone" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: sms_campaign_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."sms_campaign_profile" (
    "org_id" "uuid" NOT NULL,
    "use_case_description" "text" NOT NULL,
    "opt_in_method" "text" NOT NULL,
    "sample_msg_1" "text" NOT NULL,
    "sample_msg_2" "text" NOT NULL,
    "opt_out_text" "text" NOT NULL,
    "help_text" "text" NOT NULL,
    "terms_url" "text" NOT NULL,
    "privacy_url" "text" NOT NULL,
    "est_monthly_messages" integer NOT NULL,
    "countries" "text"[] DEFAULT '{US}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: sms_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."sms_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "phone_number" "text" NOT NULL,
    "to_number" "text" NOT NULL,
    "from_number" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "body" "text",
    "status" "text",
    "twilio_sid" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "lead_id" "uuid",
    "archived" boolean,
    CONSTRAINT "sms_messages_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"])))
);


--
-- Name: stripe_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."stripe_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "stripe_invoice_id" "text" NOT NULL,
    "stripe_customer_id" "text",
    "status" "text",
    "hosted_invoice_url" "text",
    "invoice_pdf" "text",
    "currency" "text",
    "amount_due" integer,
    "amount_paid" integer,
    "amount_remaining" integer,
    "total" integer,
    "subtotal" integer,
    "tax" integer,
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finalized_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "raw_payload" "jsonb" NOT NULL
);


--
-- Name: stripe_subscription_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."stripe_subscription_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text" NOT NULL,
    "stripe_customer_id" "text",
    "event_type" "text" NOT NULL,
    "status" "text",
    "collection_method" "text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "cancel_at" timestamp with time zone,
    "cancel_at_period_end" boolean,
    "default_payment_method_id" "text",
    "raw_payload" "jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: subscription_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."subscription_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text",
    "event" "text" NOT NULL,
    "from_plan" "text",
    "to_plan" "text",
    "proration_cents" integer DEFAULT 0,
    "raw" "jsonb",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: task_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."task_reminders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "reminder_time" timestamp with time zone NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "notification_type" character varying(50) DEFAULT 'browser'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_reminders_notification_type_check" CHECK ((("notification_type")::"text" = ANY ((ARRAY['browser'::character varying, 'email'::character varying, 'both'::character varying])::"text"[]))),
    CONSTRAINT "task_reminders_status_check" CHECK ((TRIM(BOTH FROM "lower"(("status")::"text")) = ANY (ARRAY['pending'::"text", 'delivered'::"text", 'canceled'::"text"])))
);


--
-- Name: TABLE "task_reminders"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."task_reminders" IS 'Reminders for tasks with notification scheduling';


--
-- Name: COLUMN "task_reminders"."status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."task_reminders"."status" IS 'Reminder status: pending, sent, cancelled';


--
-- Name: COLUMN "task_reminders"."notification_type"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."task_reminders"."notification_type" IS 'Notification type: browser, email, both';


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "priority" character varying(50) DEFAULT 'medium'::character varying NOT NULL,
    "type" character varying(100) DEFAULT 'general'::character varying NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "reminder_enabled" boolean DEFAULT false,
    "lead_id" "uuid",
    "lead_name" character varying(255),
    "organization_id" "uuid" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reminder_time" timestamp with time zone,
    "due_timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    CONSTRAINT "tasks_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['urgent'::character varying, 'high'::character varying, 'medium'::character varying, 'low'::character varying])::"text"[]))),
    CONSTRAINT "tasks_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying])::"text"[]))),
    CONSTRAINT "tasks_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['follow_up'::character varying, 'call'::character varying, 'email'::character varying, 'meeting'::character varying, 'proposal'::character varying, 'general'::character varying])::"text"[])))
);


--
-- Name: TABLE "tasks"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."tasks" IS 'Main tasks table for task management system';


--
-- Name: COLUMN "tasks"."status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."tasks"."status" IS 'Task status: pending, in_progress, completed';


--
-- Name: COLUMN "tasks"."priority"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."tasks"."priority" IS 'Task priority: urgent, high, medium, low';


--
-- Name: COLUMN "tasks"."type"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."tasks"."type" IS 'Task type: follow_up, call, email, meeting, proposal, general';


--
-- Name: task_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."task_stats" AS
 SELECT "organization_id",
    "owner_id",
    "count"(*) AS "total_tasks",
    "count"(
        CASE
            WHEN (("status")::"text" = 'pending'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pending_tasks",
    "count"(
        CASE
            WHEN (("status")::"text" = 'in_progress'::"text") THEN 1
            ELSE NULL::integer
        END) AS "in_progress_tasks",
    "count"(
        CASE
            WHEN (("status")::"text" = 'completed'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completed_tasks",
    "count"(
        CASE
            WHEN (("due_date" < "now"()) AND (("status")::"text" <> 'completed'::"text")) THEN 1
            ELSE NULL::integer
        END) AS "overdue_tasks",
    "count"(
        CASE
            WHEN (("date"("due_date") = "date"("now"())) AND (("status")::"text" <> 'completed'::"text")) THEN 1
            ELSE NULL::integer
        END) AS "due_today_tasks",
    "count"(
        CASE
            WHEN ((("due_date" >= "now"()) AND ("due_date" <= ("now"() + '7 days'::interval))) AND (("status")::"text" <> 'completed'::"text")) THEN 1
            ELSE NULL::integer
        END) AS "due_this_week_tasks",
    "count"(
        CASE
            WHEN (("priority")::"text" = 'urgent'::"text") THEN 1
            ELSE NULL::integer
        END) AS "urgent_tasks",
    "count"(
        CASE
            WHEN (("priority")::"text" = 'high'::"text") THEN 1
            ELSE NULL::integer
        END) AS "high_priority_tasks",
    "count"(
        CASE
            WHEN ("reminder_enabled" = true) THEN 1
            ELSE NULL::integer
        END) AS "tasks_with_reminders"
   FROM "public"."tasks" "t"
  GROUP BY "organization_id", "owner_id";


--
-- Name: VIEW "task_stats"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW "public"."task_stats" IS 'Aggregated task statistics for organizations and users';


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


--
-- Name: usage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "seat_id" "uuid",
    "category" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "qty" numeric NOT NULL,
    "provider" "text",
    "raw_cost_cents" integer,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: usage_overage_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."usage_overage_catalog" (
    "overage_code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "aggregation" "text" DEFAULT 'sum'::"text" NOT NULL,
    "rounding_mode" "text" DEFAULT 'ceil'::"text" NOT NULL,
    "billing_increment_seconds" integer DEFAULT 60 NOT NULL,
    "unit_precision" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "env" "text" DEFAULT 'test'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "price_cents" integer,
    CONSTRAINT "usage_overage_catalog_aggregation_check" CHECK (("aggregation" = ANY (ARRAY['sum'::"text", 'max'::"text", 'last_during_period'::"text", 'last_ever'::"text"]))),
    CONSTRAINT "usage_overage_catalog_env_check" CHECK (("env" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "usage_overage_catalog_provider_check" CHECK (("provider" = ANY (ARRAY['twilio'::"text", 'vapi'::"text", 'internal'::"text"]))),
    CONSTRAINT "usage_overage_catalog_rounding_mode_check" CHECK (("rounding_mode" = ANY (ARRAY['none'::"text", 'ceil'::"text", 'floor'::"text", 'round'::"text"]))),
    CONSTRAINT "usage_overage_catalog_unit_check" CHECK (("unit" = ANY (ARRAY['minute'::"text", 'message'::"text", 'email'::"text"])))
);


--
-- Name: usage_period_rollups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."usage_period_rollups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "minutes_total" numeric DEFAULT 0 NOT NULL,
    "sms_total" numeric DEFAULT 0 NOT NULL,
    "emails_total" numeric DEFAULT 0 NOT NULL,
    "minutes_overage" numeric DEFAULT 0 NOT NULL,
    "sms_overage" numeric DEFAULT 0 NOT NULL,
    "emails_overage" numeric DEFAULT 0 NOT NULL,
    "stripe_usage_push_status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: usage_topups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."usage_topups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid" NOT NULL,
    "stripe_payment_intent_id" "text",
    "stripe_invoice_id" "text",
    "amount_cents" bigint NOT NULL,
    "status" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "usage_topups_amount_cents_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "usage_topups_attempts_check" CHECK (("attempts" >= 0)),
    CONSTRAINT "usage_topups_status_check" CHECK (("status" = ANY (ARRAY['initiated'::"text", 'requires_action'::"text", 'succeeded'::"text", 'failed'::"text", 'canceled'::"text"])))
);


--
-- Name: usage_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."usage_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "amount_cents" bigint NOT NULL,
    "post_balance_cents" bigint NOT NULL,
    "reference_type" "text",
    "reference_id" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    "direction" "text",
    CONSTRAINT "usage_transactions_amount_cents_check" CHECK (("amount_cents" <> 0)),
    CONSTRAINT "usage_transactions_direction_check" CHECK (("direction" = ANY (ARRAY['credit'::"text", 'debit'::"text"]))),
    CONSTRAINT "usage_transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['credit_top_up'::"text", 'credit_adjustment'::"text", 'debit_voice'::"text", 'debit_sms'::"text", 'debit_email'::"text", 'debit_other'::"text", 'credit_refund'::"text"])))
);


--
-- Name: usage_wallet_auto_recharge_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."usage_wallet_auto_recharge_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auto_recharge_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "requested_amount_cents" integer NOT NULL,
    "balance_before_cents" integer,
    "balance_after_cents" integer,
    "stripe_payment_intent_id" "text",
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "usage_wallet_auto_recharge_events_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'succeeded'::"text", 'failed'::"text", 'disabled'::"text"])))
);


--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_notification_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "browser_notifications" boolean DEFAULT true,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "reminder_advance_minutes" integer DEFAULT 15,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: user_organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "organization_id" "uuid",
    "role" character varying(50) DEFAULT 'member'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: user_phone_numbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_phone_numbers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "phone_number" "text",
    "area_code" character varying(10),
    "provider" "text" DEFAULT 'twilio'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "twilio_number_sid" "text",
    "messaging_service_sid" "text",
    "e164" "text",
    "country" "text",
    "capabilities" "text"[],
    "status" "text" DEFAULT 'active'::"text",
    "purchased_at" timestamp with time zone DEFAULT "now"(),
    "voice_webhook_url" "text",
    "sms_webhook_url" "text",
    "assigned_at" timestamp with time zone,
    "released_at" timestamp with time zone,
    CONSTRAINT "user_phone_numbers_e164_chk" CHECK ((("e164" IS NULL) OR ("e164" ~ '^\+[1-9][0-9]{6,14}$'::"text")))
);


--
-- Name: voice_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."voice_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "call_history_id" "uuid",
    "twilio_call_sid" character varying(255),
    "phone_number" character varying(20) NOT NULL,
    "to_number" character varying(20) NOT NULL,
    "from_number" character varying(20) NOT NULL,
    "direction" character varying(10) NOT NULL,
    "country_code" character varying(10) DEFAULT 'US'::character varying NOT NULL,
    "call_duration_seconds" integer DEFAULT 0 NOT NULL,
    "call_duration_minutes" numeric(8,2) DEFAULT 0.00 NOT NULL,
    "usage_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "billed_cents" integer DEFAULT 0,
    "billed_minutes_overage" integer DEFAULT 0,
    "included_minutes" integer DEFAULT 0,
    "unit_cost_cents" integer DEFAULT 0,
    "coverage" "text" DEFAULT 'unknown'::"text",
    "wallet_post_balance_cents" integer,
    CONSTRAINT "voice_usage_direction_check" CHECK ((("direction")::"text" = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::"text"[])))
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
)
PARTITION BY RANGE ("inserted_at");


--
-- Name: messages_2025_10_21; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2025_10_21" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2025_10_22; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2025_10_22" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2025_10_23; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2025_10_23" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2025_10_24; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2025_10_24" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2025_10_25; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2025_10_25" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2025_10_26; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2025_10_26" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: messages_2025_10_27; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."messages_2025_10_27" (
    "topic" "text" NOT NULL,
    "extension" "text" NOT NULL,
    "payload" "jsonb",
    "event" "text",
    "private" boolean DEFAULT false,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "inserted_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."schema_migrations" (
    "version" bigint NOT NULL,
    "inserted_at" timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE "realtime"."subscription" (
    "id" bigint NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "entity" "regclass" NOT NULL,
    "filters" "realtime"."user_defined_filter"[] DEFAULT '{}'::"realtime"."user_defined_filter"[] NOT NULL,
    "claims" "jsonb" NOT NULL,
    "claims_role" "regrole" GENERATED ALWAYS AS ("realtime"."to_regrole"(("claims" ->> 'role'::"text"))) STORED NOT NULL,
    "created_at" timestamp without time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE "realtime"."subscription" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "realtime"."subscription_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


--
-- Name: COLUMN "buckets"."owner"; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."buckets_analytics" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb",
    "level" integer
);


--
-- Name: COLUMN "objects"."owner"; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."prefixes" (
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "level" integer GENERATED ALWAYS AS ("storage"."get_level"("name")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE "supabase_migrations"."schema_migrations" (
    "version" "text" NOT NULL,
    "statements" "text"[],
    "name" "text"
);


--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE "supabase_migrations"."seed_files" (
    "path" "text" NOT NULL,
    "hash" "text" NOT NULL
);


--
-- Name: messages_2025_10_21; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2025_10_21" FOR VALUES FROM ('2025-10-21 00:00:00') TO ('2025-10-22 00:00:00');


--
-- Name: messages_2025_10_22; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2025_10_22" FOR VALUES FROM ('2025-10-22 00:00:00') TO ('2025-10-23 00:00:00');


--
-- Name: messages_2025_10_23; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2025_10_23" FOR VALUES FROM ('2025-10-23 00:00:00') TO ('2025-10-24 00:00:00');


--
-- Name: messages_2025_10_24; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2025_10_24" FOR VALUES FROM ('2025-10-24 00:00:00') TO ('2025-10-25 00:00:00');


--
-- Name: messages_2025_10_25; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2025_10_25" FOR VALUES FROM ('2025-10-25 00:00:00') TO ('2025-10-26 00:00:00');


--
-- Name: messages_2025_10_26; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2025_10_26" FOR VALUES FROM ('2025-10-26 00:00:00') TO ('2025-10-27 00:00:00');


--
-- Name: messages_2025_10_27; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages" ATTACH PARTITION "realtime"."messages_2025_10_27" FOR VALUES FROM ('2025-10-27 00:00:00') TO ('2025-10-28 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: addon_catalog addon_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."addon_catalog"
    ADD CONSTRAINT "addon_catalog_pkey" PRIMARY KEY ("addon_code");


--
-- Name: agent_phone_numbers agent_phone_numbers_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."agent_phone_numbers"
    ADD CONSTRAINT "agent_phone_numbers_phone_number_key" UNIQUE ("phone_number");


--
-- Name: agent_phone_numbers agent_phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."agent_phone_numbers"
    ADD CONSTRAINT "agent_phone_numbers_pkey" PRIMARY KEY ("id");


--
-- Name: billing_settings billing_settings_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."billing_settings"
    ADD CONSTRAINT "billing_settings_organization_id_key" UNIQUE ("organization_id");


--
-- Name: billing_settings billing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."billing_settings"
    ADD CONSTRAINT "billing_settings_pkey" PRIMARY KEY ("id");


--
-- Name: call_history call_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "call_history_pkey" PRIMARY KEY ("id");


--
-- Name: call_history call_history_twilio_call_sid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "call_history_twilio_call_sid_key" UNIQUE ("twilio_call_sid");


--
-- Name: communications communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."communications"
    ADD CONSTRAINT "communications_pkey" PRIMARY KEY ("id");


--
-- Name: invoice_snapshots invoice_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invoice_snapshots"
    ADD CONSTRAINT "invoice_snapshots_pkey" PRIMARY KEY ("id");


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");


--
-- Name: monthly_billing monthly_billing_organization_id_billing_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."monthly_billing"
    ADD CONSTRAINT "monthly_billing_organization_id_billing_month_key" UNIQUE ("organization_id", "billing_month");


--
-- Name: monthly_billing monthly_billing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."monthly_billing"
    ADD CONSTRAINT "monthly_billing_pkey" PRIMARY KEY ("id");


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");


--
-- Name: org_suspensions org_suspensions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."org_suspensions"
    ADD CONSTRAINT "org_suspensions_pkey" PRIMARY KEY ("id");


--
-- Name: organization_invites organization_invites_email_organization_id_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_email_organization_id_status_key" UNIQUE ("email", "organization_id", "status");


--
-- Name: organization_invites organization_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id");


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");


--
-- Name: organizations organizations_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_stripe_customer_id_key" UNIQUE ("stripe_customer_id");


--
-- Name: payment_failure_events payment_failure_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payment_failure_events"
    ADD CONSTRAINT "payment_failure_events_pkey" PRIMARY KEY ("id");


--
-- Name: phone_numbers phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."phone_numbers"
    ADD CONSTRAINT "phone_numbers_pkey" PRIMARY KEY ("id");


--
-- Name: plan_catalog plan_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plan_catalog"
    ADD CONSTRAINT "plan_catalog_pkey" PRIMARY KEY ("plan_code");


--
-- Name: plan_catalog plan_catalog_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."plan_catalog"
    ADD CONSTRAINT "plan_catalog_unique" UNIQUE ("plan_code", "env", "active");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: seat_events seat_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seat_events"
    ADD CONSTRAINT "seat_events_pkey" PRIMARY KEY ("id");


--
-- Name: seats seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seats"
    ADD CONSTRAINT "seats_pkey" PRIMARY KEY ("id");


--
-- Name: sms_brand_profile sms_brand_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sms_brand_profile"
    ADD CONSTRAINT "sms_brand_profile_pkey" PRIMARY KEY ("org_id");


--
-- Name: sms_campaign_profile sms_campaign_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sms_campaign_profile"
    ADD CONSTRAINT "sms_campaign_profile_pkey" PRIMARY KEY ("org_id");


--
-- Name: sms_messages sms_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sms_messages"
    ADD CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id");


--
-- Name: sms_messages sms_messages_twilio_sid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sms_messages"
    ADD CONSTRAINT "sms_messages_twilio_sid_key" UNIQUE ("twilio_sid");


--
-- Name: stripe_invoices stripe_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stripe_invoices"
    ADD CONSTRAINT "stripe_invoices_pkey" PRIMARY KEY ("id");


--
-- Name: stripe_invoices stripe_invoices_stripe_invoice_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stripe_invoices"
    ADD CONSTRAINT "stripe_invoices_stripe_invoice_id_key" UNIQUE ("stripe_invoice_id");


--
-- Name: stripe_subscription_snapshots stripe_subscription_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stripe_subscription_snapshots"
    ADD CONSTRAINT "stripe_subscription_snapshots_pkey" PRIMARY KEY ("id");


--
-- Name: subscription_ledger subscription_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."subscription_ledger"
    ADD CONSTRAINT "subscription_ledger_pkey" PRIMARY KEY ("id");


--
-- Name: task_reminders task_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."task_reminders"
    ADD CONSTRAINT "task_reminders_pkey" PRIMARY KEY ("id");


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");


--
-- Name: team_members team_members_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");


--
-- Name: usage_events usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id");


--
-- Name: usage_overage_catalog usage_overage_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_overage_catalog"
    ADD CONSTRAINT "usage_overage_catalog_pkey" PRIMARY KEY ("overage_code");


--
-- Name: usage_overage_catalog usage_overage_catalog_stripe_price_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_overage_catalog"
    ADD CONSTRAINT "usage_overage_catalog_stripe_price_id_key" UNIQUE ("stripe_price_id");


--
-- Name: usage_period_rollups usage_period_rollups_org_id_period_start_period_end_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_period_rollups"
    ADD CONSTRAINT "usage_period_rollups_org_id_period_start_period_end_key" UNIQUE ("org_id", "period_start", "period_end");


--
-- Name: usage_period_rollups usage_period_rollups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_period_rollups"
    ADD CONSTRAINT "usage_period_rollups_pkey" PRIMARY KEY ("id");


--
-- Name: usage_topups usage_topups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_topups"
    ADD CONSTRAINT "usage_topups_pkey" PRIMARY KEY ("id");


--
-- Name: usage_topups usage_topups_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_topups"
    ADD CONSTRAINT "usage_topups_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");


--
-- Name: usage_transactions usage_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_transactions"
    ADD CONSTRAINT "usage_transactions_pkey" PRIMARY KEY ("id");


--
-- Name: usage_wallet_auto_recharge_events usage_wallet_auto_recharge_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_wallet_auto_recharge_events"
    ADD CONSTRAINT "usage_wallet_auto_recharge_events_pkey" PRIMARY KEY ("id");


--
-- Name: usage_wallet_auto_recharge usage_wallet_auto_recharge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_wallet_auto_recharge"
    ADD CONSTRAINT "usage_wallet_auto_recharge_pkey" PRIMARY KEY ("id");


--
-- Name: usage_wallets usage_wallets_org_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_wallets"
    ADD CONSTRAINT "usage_wallets_org_unique" UNIQUE ("organization_id");


--
-- Name: usage_wallets usage_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_wallets"
    ADD CONSTRAINT "usage_wallets_pkey" PRIMARY KEY ("id");


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id");


--
-- Name: user_notification_settings user_notification_settings_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");


--
-- Name: user_organizations user_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id");


--
-- Name: user_organizations user_organizations_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");


--
-- Name: user_phone_numbers user_phone_numbers_org_e164_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_phone_numbers"
    ADD CONSTRAINT "user_phone_numbers_org_e164_key" UNIQUE ("organization_id", "e164");


--
-- Name: user_phone_numbers user_phone_numbers_org_twilio_sid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_phone_numbers"
    ADD CONSTRAINT "user_phone_numbers_org_twilio_sid_key" UNIQUE ("organization_id", "twilio_number_sid");


--
-- Name: user_phone_numbers user_phone_numbers_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_phone_numbers"
    ADD CONSTRAINT "user_phone_numbers_phone_number_key" UNIQUE ("phone_number");


--
-- Name: user_phone_numbers user_phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_phone_numbers"
    ADD CONSTRAINT "user_phone_numbers_pkey" PRIMARY KEY ("id");


--
-- Name: voice_usage voice_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."voice_usage"
    ADD CONSTRAINT "voice_usage_pkey" PRIMARY KEY ("id");


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2025_10_21 messages_2025_10_21_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2025_10_21"
    ADD CONSTRAINT "messages_2025_10_21_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2025_10_22 messages_2025_10_22_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2025_10_22"
    ADD CONSTRAINT "messages_2025_10_22_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2025_10_23 messages_2025_10_23_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2025_10_23"
    ADD CONSTRAINT "messages_2025_10_23_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2025_10_24 messages_2025_10_24_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2025_10_24"
    ADD CONSTRAINT "messages_2025_10_24_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2025_10_25 messages_2025_10_25_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2025_10_25"
    ADD CONSTRAINT "messages_2025_10_25_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2025_10_26 messages_2025_10_26_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2025_10_26"
    ADD CONSTRAINT "messages_2025_10_26_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: messages_2025_10_27 messages_2025_10_27_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."messages_2025_10_27"
    ADD CONSTRAINT "messages_2025_10_27_pkey" PRIMARY KEY ("id", "inserted_at");


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."subscription"
    ADD CONSTRAINT "pk_subscription" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY "realtime"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_pkey" PRIMARY KEY ("bucket_id", "level", "name");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY "supabase_migrations"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY "supabase_migrations"."seed_files"
    ADD CONSTRAINT "seed_files_pkey" PRIMARY KEY ("path");


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");


--
-- Name: INDEX "identities_email_idx"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);


--
-- Name: INDEX "users_email_partial_key"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");


--
-- Name: idx_agent_phone_numbers_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_agent_phone_numbers_agent_id" ON "public"."agent_phone_numbers" USING "btree" ("agent_id");


--
-- Name: idx_call_history_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_call_history_agent_id" ON "public"."call_history" USING "btree" ("agent_id");


--
-- Name: idx_call_history_call_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_call_history_call_direction" ON "public"."call_history" USING "btree" ("call_direction");


--
-- Name: idx_call_history_call_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_call_history_call_start_time" ON "public"."call_history" USING "btree" ("call_start_time");


--
-- Name: idx_call_history_call_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_call_history_call_status" ON "public"."call_history" USING "btree" ("call_status");


--
-- Name: idx_call_history_from_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_call_history_from_number" ON "public"."call_history" USING "btree" ("from_number");


--
-- Name: idx_call_history_in_progress; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_call_history_in_progress" ON "public"."call_history" USING "btree" ("call_status") WHERE (("call_status")::"text" = ANY ((ARRAY['answered'::character varying, 'in-progress'::character varying, 'in_progress'::character varying])::"text"[]));


--
-- Name: idx_call_history_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_call_history_lead_id" ON "public"."call_history" USING "btree" ("lead_id");


--
-- Name: idx_call_history_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_call_history_organization_id" ON "public"."call_history" USING "btree" ("organization_id");


--
-- Name: idx_call_history_to_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_call_history_to_number" ON "public"."call_history" USING "btree" ("to_number");


--
-- Name: idx_call_history_twilio_sid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_call_history_twilio_sid" ON "public"."call_history" USING "btree" ("twilio_call_sid");


--
-- Name: idx_communications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_communications_created_at" ON "public"."communications" USING "btree" ("created_at");


--
-- Name: idx_communications_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_communications_lead_id" ON "public"."communications" USING "btree" ("lead_id");


--
-- Name: idx_leads_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_leads_assigned_to" ON "public"."leads" USING "btree" ("assigned_to");


--
-- Name: idx_leads_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_leads_created_at" ON "public"."leads" USING "btree" ("created_at");


--
-- Name: idx_leads_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_leads_organization_id" ON "public"."leads" USING "btree" ("organization_id");


--
-- Name: idx_leads_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_leads_stage" ON "public"."leads" USING "btree" ("stage");


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_leads_status" ON "public"."leads" USING "btree" ("status");


--
-- Name: idx_monthly_billing_org_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_monthly_billing_org_month" ON "public"."monthly_billing" USING "btree" ("organization_id", "billing_month");


--
-- Name: idx_phone_numbers_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_phone_numbers_org_id" ON "public"."phone_numbers" USING "btree" ("org_id");


--
-- Name: idx_phone_numbers_seat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_phone_numbers_seat_id" ON "public"."phone_numbers" USING "btree" ("seat_id");


--
-- Name: idx_phone_numbers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_phone_numbers_status" ON "public"."phone_numbers" USING "btree" ("status");


--
-- Name: idx_sms_messages_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sms_messages_agent_id" ON "public"."sms_messages" USING "btree" ("agent_id");


--
-- Name: idx_sms_messages_phone_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_sms_messages_phone_number" ON "public"."sms_messages" USING "btree" ("phone_number");


--
-- Name: idx_stripe_invoices_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_stripe_invoices_org_id" ON "public"."stripe_invoices" USING "btree" ("org_id");


--
-- Name: idx_stripe_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_stripe_invoices_status" ON "public"."stripe_invoices" USING "btree" ("status");


--
-- Name: idx_stripe_subscription_snapshots_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_stripe_subscription_snapshots_event" ON "public"."stripe_subscription_snapshots" USING "btree" ("event_type");


--
-- Name: idx_stripe_subscription_snapshots_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_stripe_subscription_snapshots_subscription" ON "public"."stripe_subscription_snapshots" USING "btree" ("stripe_subscription_id");


--
-- Name: idx_task_reminders_reminder_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_task_reminders_reminder_time" ON "public"."task_reminders" USING "btree" ("reminder_time");


--
-- Name: idx_task_reminders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_task_reminders_status" ON "public"."task_reminders" USING "btree" ("status");


--
-- Name: idx_task_reminders_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_task_reminders_task_id" ON "public"."task_reminders" USING "btree" ("task_id");


--
-- Name: idx_tasks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_created_at" ON "public"."tasks" USING "btree" ("created_at");


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");


--
-- Name: idx_tasks_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_lead_id" ON "public"."tasks" USING "btree" ("lead_id");


--
-- Name: idx_tasks_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_organization_id" ON "public"."tasks" USING "btree" ("organization_id");


--
-- Name: idx_tasks_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_owner_id" ON "public"."tasks" USING "btree" ("owner_id");


--
-- Name: idx_tasks_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_priority" ON "public"."tasks" USING "btree" ("priority");


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");


--
-- Name: idx_usage_overage_catalog_env_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_usage_overage_catalog_env_active" ON "public"."usage_overage_catalog" USING "btree" ("env", "active");


--
-- Name: idx_usage_transactions_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_usage_transactions_org" ON "public"."usage_transactions" USING "btree" ("organization_id", "created_at" DESC);


--
-- Name: idx_usage_wallet_auto_recharge_events_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_usage_wallet_auto_recharge_events_org" ON "public"."usage_wallet_auto_recharge_events" USING "btree" ("organization_id", "created_at" DESC);


--
-- Name: idx_usage_wallet_auto_recharge_org; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "idx_usage_wallet_auto_recharge_org" ON "public"."usage_wallet_auto_recharge" USING "btree" ("organization_id");


--
-- Name: idx_user_notification_settings_user_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_user_notification_settings_user_org" ON "public"."user_notification_settings" USING "btree" ("user_id", "organization_id");


--
-- Name: idx_user_organizations_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_user_organizations_org_id" ON "public"."user_organizations" USING "btree" ("organization_id");


--
-- Name: idx_user_organizations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_user_organizations_user_id" ON "public"."user_organizations" USING "btree" ("user_id");


--
-- Name: idx_user_phone_numbers_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_user_phone_numbers_org" ON "public"."user_phone_numbers" USING "btree" ("organization_id");


--
-- Name: idx_user_phone_numbers_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_user_phone_numbers_org_id" ON "public"."user_phone_numbers" USING "btree" ("organization_id");


--
-- Name: idx_user_phone_numbers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_user_phone_numbers_status" ON "public"."user_phone_numbers" USING "btree" ("status");


--
-- Name: idx_user_phone_numbers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_user_phone_numbers_user" ON "public"."user_phone_numbers" USING "btree" ("user_id");


--
-- Name: idx_user_phone_numbers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_user_phone_numbers_user_id" ON "public"."user_phone_numbers" USING "btree" ("user_id");


--
-- Name: idx_voice_usage_agent_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_voice_usage_agent_date" ON "public"."voice_usage" USING "btree" ("agent_id", "usage_date");


--
-- Name: idx_voice_usage_org_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_voice_usage_org_date" ON "public"."voice_usage" USING "btree" ("organization_id", "usage_date");


--
-- Name: notifications_unique_reminder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "notifications_unique_reminder_idx" ON "public"."notifications" USING "btree" ("reminder_id") WHERE ("reminder_id" IS NOT NULL);


--
-- Name: notifications_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_user_created_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: task_reminders_status_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "task_reminders_status_time_idx" ON "public"."task_reminders" USING "btree" ("status", "reminder_time");


--
-- Name: task_reminders_task_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "task_reminders_task_idx" ON "public"."task_reminders" USING "btree" ("task_id");


--
-- Name: task_reminders_unique_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "task_reminders_unique_pending_idx" ON "public"."task_reminders" USING "btree" ("task_id", "reminder_time", COALESCE("notification_type", 'browser'::character varying)) WHERE (TRIM(BOTH FROM "lower"(("status")::"text")) = 'pending'::"text");


--
-- Name: tasks_due_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tasks_due_date_idx" ON "public"."tasks" USING "btree" ("due_date");


--
-- Name: tasks_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tasks_owner_idx" ON "public"."tasks" USING "btree" ("owner_id");


--
-- Name: usage_topups_wallet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "usage_topups_wallet_idx" ON "public"."usage_topups" USING "btree" ("wallet_id", "created_at");


--
-- Name: usage_transactions_wallet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "usage_transactions_wallet_idx" ON "public"."usage_transactions" USING "btree" ("wallet_id", "created_at");


--
-- Name: usage_wallets_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "usage_wallets_org_idx" ON "public"."usage_wallets" USING "btree" ("organization_id");


--
-- Name: usage_wallets_organization_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "usage_wallets_organization_unique" ON "public"."usage_wallets" USING "btree" ("organization_id");


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "ix_realtime_subscription_entity" ON "realtime"."subscription" USING "btree" ("entity");


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_inserted_at_topic_index" ON ONLY "realtime"."messages" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2025_10_21_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2025_10_21_inserted_at_topic_idx" ON "realtime"."messages_2025_10_21" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2025_10_22_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2025_10_22_inserted_at_topic_idx" ON "realtime"."messages_2025_10_22" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2025_10_23_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2025_10_23_inserted_at_topic_idx" ON "realtime"."messages_2025_10_23" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2025_10_24_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2025_10_24_inserted_at_topic_idx" ON "realtime"."messages_2025_10_24" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2025_10_25_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2025_10_25_inserted_at_topic_idx" ON "realtime"."messages_2025_10_25" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2025_10_26_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2025_10_26_inserted_at_topic_idx" ON "realtime"."messages_2025_10_26" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: messages_2025_10_27_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX "messages_2025_10_27_inserted_at_topic_idx" ON "realtime"."messages_2025_10_27" USING "btree" ("inserted_at" DESC, "topic") WHERE (("extension" = 'broadcast'::"text") AND ("private" IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX "subscription_subscription_id_entity_filters_key" ON "realtime"."subscription" USING "btree" ("subscription_id", "entity", "filters");


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "idx_name_bucket_level_unique" ON "storage"."objects" USING "btree" ("name" COLLATE "C", "bucket_id", "level");


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_objects_lower_name" ON "storage"."objects" USING "btree" (("path_tokens"["level"]), "lower"("name") "text_pattern_ops", "bucket_id", "level");


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "idx_prefixes_lower_name" ON "storage"."prefixes" USING "btree" ("bucket_id", "level", (("string_to_array"("name", '/'::"text"))["level"]), "lower"("name") "text_pattern_ops");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX "objects_bucket_id_level_idx" ON "storage"."objects" USING "btree" ("bucket_id", "level", "name" COLLATE "C");


--
-- Name: messages_2025_10_21_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2025_10_21_inserted_at_topic_idx";


--
-- Name: messages_2025_10_21_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2025_10_21_pkey";


--
-- Name: messages_2025_10_22_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2025_10_22_inserted_at_topic_idx";


--
-- Name: messages_2025_10_22_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2025_10_22_pkey";


--
-- Name: messages_2025_10_23_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2025_10_23_inserted_at_topic_idx";


--
-- Name: messages_2025_10_23_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2025_10_23_pkey";


--
-- Name: messages_2025_10_24_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2025_10_24_inserted_at_topic_idx";


--
-- Name: messages_2025_10_24_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2025_10_24_pkey";


--
-- Name: messages_2025_10_25_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2025_10_25_inserted_at_topic_idx";


--
-- Name: messages_2025_10_25_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2025_10_25_pkey";


--
-- Name: messages_2025_10_26_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2025_10_26_inserted_at_topic_idx";


--
-- Name: messages_2025_10_26_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2025_10_26_pkey";


--
-- Name: messages_2025_10_27_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_inserted_at_topic_index" ATTACH PARTITION "realtime"."messages_2025_10_27_inserted_at_topic_idx";


--
-- Name: messages_2025_10_27_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX "realtime"."messages_pkey" ATTACH PARTITION "realtime"."messages_2025_10_27_pkey";


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();


--
-- Name: user_phone_numbers trg_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."user_phone_numbers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: usage_overage_catalog trg_touch_usage_overage_catalog_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_touch_usage_overage_catalog_updated_at" BEFORE UPDATE ON "public"."usage_overage_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."touch_usage_overage_catalog_updated_at"();


--
-- Name: call_history trigger_calculate_call_duration; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_calculate_call_duration" BEFORE INSERT OR UPDATE ON "public"."call_history" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_call_duration"();


--
-- Name: communications trigger_communications_notifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_communications_notifications" AFTER INSERT ON "public"."communications" FOR EACH ROW EXECUTE FUNCTION "public"."create_automatic_notification"();


--
-- Name: tasks trigger_create_task_reminder; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_create_task_reminder" AFTER INSERT OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."create_task_reminder"();


--
-- Name: leads trigger_leads_notifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_leads_notifications" AFTER INSERT OR UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."create_automatic_notification"();


--
-- Name: task_reminders trigger_task_reminders; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_task_reminders" AFTER INSERT ON "public"."task_reminders" FOR EACH ROW EXECUTE FUNCTION "public"."create_automatic_notification"();


--
-- Name: tasks trigger_tasks_notifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_tasks_notifications" AFTER INSERT OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."create_automatic_notification"();


--
-- Name: call_history trigger_update_call_history_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trigger_update_call_history_updated_at" BEFORE UPDATE ON "public"."call_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_call_history_updated_at"();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_leads_updated_at" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: task_reminders update_task_reminders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_task_reminders_updated_at" BEFORE UPDATE ON "public"."task_reminders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: user_notification_settings update_user_notification_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_user_notification_settings_updated_at" BEFORE UPDATE ON "public"."user_notification_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER "tr_check_filters" BEFORE INSERT OR UPDATE ON "realtime"."subscription" FOR EACH ROW EXECUTE FUNCTION "realtime"."subscription_check_filters"();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- Name: agent_phone_numbers agent_phone_numbers_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."agent_phone_numbers"
    ADD CONSTRAINT "agent_phone_numbers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: billing_settings billing_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."billing_settings"
    ADD CONSTRAINT "billing_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: call_history call_history_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "call_history_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: call_history call_history_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "call_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;


--
-- Name: call_history call_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "call_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: communications communications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."communications"
    ADD CONSTRAINT "communications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: communications communications_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."communications"
    ADD CONSTRAINT "communications_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;


--
-- Name: communications communications_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."communications"
    ADD CONSTRAINT "communications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: communications communications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."communications"
    ADD CONSTRAINT "communications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");


--
-- Name: invoice_snapshots invoice_snapshots_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invoice_snapshots"
    ADD CONSTRAINT "invoice_snapshots_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: leads leads_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");


--
-- Name: leads leads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: leads leads_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: monthly_billing monthly_billing_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."monthly_billing"
    ADD CONSTRAINT "monthly_billing_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: notifications notifications_reminder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."task_reminders"("id") ON DELETE CASCADE;


--
-- Name: org_suspensions org_suspensions_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."org_suspensions"
    ADD CONSTRAINT "org_suspensions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: organization_invites organization_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: organization_invites organization_invites_invited_by_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_invited_by_fkey1" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: organization_invites organization_invites_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."organization_invites"
    ADD CONSTRAINT "organization_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: organizations organizations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");


--
-- Name: payment_failure_events payment_failure_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."payment_failure_events"
    ADD CONSTRAINT "payment_failure_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: phone_numbers phone_numbers_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."phone_numbers"
    ADD CONSTRAINT "phone_numbers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: phone_numbers phone_numbers_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."phone_numbers"
    ADD CONSTRAINT "phone_numbers_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: seat_events seat_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seat_events"
    ADD CONSTRAINT "seat_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: seat_events seat_events_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seat_events"
    ADD CONSTRAINT "seat_events_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE SET NULL;


--
-- Name: seats seats_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seats"
    ADD CONSTRAINT "seats_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: seats seats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seats"
    ADD CONSTRAINT "seats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: sms_brand_profile sms_brand_profile_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sms_brand_profile"
    ADD CONSTRAINT "sms_brand_profile_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: sms_campaign_profile sms_campaign_profile_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sms_campaign_profile"
    ADD CONSTRAINT "sms_campaign_profile_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: sms_messages sms_messages_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sms_messages"
    ADD CONSTRAINT "sms_messages_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: sms_messages sms_messages_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."sms_messages"
    ADD CONSTRAINT "sms_messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;


--
-- Name: stripe_invoices stripe_invoices_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stripe_invoices"
    ADD CONSTRAINT "stripe_invoices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: stripe_subscription_snapshots stripe_subscription_snapshots_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."stripe_subscription_snapshots"
    ADD CONSTRAINT "stripe_subscription_snapshots_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: subscription_ledger subscription_ledger_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."subscription_ledger"
    ADD CONSTRAINT "subscription_ledger_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: task_reminders task_reminders_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."task_reminders"
    ADD CONSTRAINT "task_reminders_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;


--
-- Name: tasks tasks_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;


--
-- Name: tasks tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: tasks tasks_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: team_members team_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");


--
-- Name: usage_events usage_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: usage_events usage_events_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_events"
    ADD CONSTRAINT "usage_events_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id");


--
-- Name: usage_period_rollups usage_period_rollups_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_period_rollups"
    ADD CONSTRAINT "usage_period_rollups_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: usage_topups usage_topups_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_topups"
    ADD CONSTRAINT "usage_topups_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."usage_wallets"("id") ON DELETE CASCADE;


--
-- Name: usage_transactions usage_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_transactions"
    ADD CONSTRAINT "usage_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."usage_wallets"("id") ON DELETE CASCADE;


--
-- Name: usage_wallet_auto_recharge_events usage_wallet_auto_recharge_events_auto_recharge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_wallet_auto_recharge_events"
    ADD CONSTRAINT "usage_wallet_auto_recharge_events_auto_recharge_id_fkey" FOREIGN KEY ("auto_recharge_id") REFERENCES "public"."usage_wallet_auto_recharge"("id") ON DELETE CASCADE;


--
-- Name: usage_wallet_auto_recharge_events usage_wallet_auto_recharge_events_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_wallet_auto_recharge_events"
    ADD CONSTRAINT "usage_wallet_auto_recharge_events_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."usage_wallet_auto_recharge"("organization_id") ON DELETE CASCADE;


--
-- Name: usage_wallet_auto_recharge_events usage_wallet_auto_recharge_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_wallet_auto_recharge_events"
    ADD CONSTRAINT "usage_wallet_auto_recharge_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: usage_wallet_auto_recharge usage_wallet_auto_recharge_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_wallet_auto_recharge"
    ADD CONSTRAINT "usage_wallet_auto_recharge_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."usage_wallets"("organization_id") ON DELETE CASCADE;


--
-- Name: usage_wallet_auto_recharge usage_wallet_auto_recharge_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_wallet_auto_recharge"
    ADD CONSTRAINT "usage_wallet_auto_recharge_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: usage_wallets usage_wallets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."usage_wallets"
    ADD CONSTRAINT "usage_wallets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: user_organizations user_organizations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: user_organizations user_organizations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: user_organizations user_organizations_user_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_organizations"
    ADD CONSTRAINT "user_organizations_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: user_phone_numbers user_phone_numbers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_phone_numbers"
    ADD CONSTRAINT "user_phone_numbers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: user_phone_numbers user_phone_numbers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_phone_numbers"
    ADD CONSTRAINT "user_phone_numbers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: voice_usage voice_usage_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."voice_usage"
    ADD CONSTRAINT "voice_usage_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: voice_usage voice_usage_call_history_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."voice_usage"
    ADD CONSTRAINT "voice_usage_call_history_id_fkey" FOREIGN KEY ("call_history_id") REFERENCES "public"."call_history"("id") ON DELETE SET NULL;


--
-- Name: voice_usage voice_usage_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."voice_usage"
    ADD CONSTRAINT "voice_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles Allow all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all profiles" ON "public"."profiles" USING (true);


--
-- Name: user_organizations Allow all user_organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all user_organizations" ON "public"."user_organizations" USING (true);


--
-- Name: organization_invites Anyone can accept invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can accept invitations" ON "public"."organization_invites" FOR UPDATE USING (true);


--
-- Name: usage_overage_catalog Authenticated can view usage overage catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view usage overage catalog" ON "public"."usage_overage_catalog" FOR SELECT TO "authenticated" USING (true);


--
-- Name: organization_invites Only owners can manage invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only owners can manage invitations" ON "public"."organization_invites" USING ((EXISTS ( SELECT 1
   FROM "public"."organizations"
  WHERE (("organizations"."id" = "organization_invites"."organization_id") AND ("organizations"."owner_id" = "auth"."uid"())))));


--
-- Name: leads Organization members can delete leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization members can delete leads" ON "public"."leads" FOR DELETE USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: leads Organization members can insert leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization members can insert leads" ON "public"."leads" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: leads Organization members can update leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization members can update leads" ON "public"."leads" FOR UPDATE USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"())))) WITH CHECK (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: leads Organization members can view leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization members can view leads" ON "public"."leads" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: user_organizations Organization owners can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization owners can manage members" ON "public"."user_organizations" USING ("public"."is_organization_owner"("organization_id"));


--
-- Name: organizations Organization owners can update their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization owners can update their organization" ON "public"."organizations" FOR UPDATE USING (("owner_id" = "auth"."uid"()));


--
-- Name: profiles Public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access" ON "public"."profiles" FOR SELECT USING (true);


--
-- Name: task_reminders Users can create reminders for accessible tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reminders for accessible tasks" ON "public"."task_reminders" FOR INSERT WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."organization_id" IN ( SELECT "tasks"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));


--
-- Name: tasks Users can create tasks in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tasks in their organization" ON "public"."tasks" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "tasks"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));


--
-- Name: call_history Users can delete calls from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete calls from their organization" ON "public"."call_history" FOR DELETE USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: communications Users can delete communications for leads in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete communications for leads in their organization" ON "public"."communications" FOR DELETE USING (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE ("leads"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = "auth"."uid"()))))));


--
-- Name: task_reminders Users can delete reminders for accessible tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete reminders for accessible tasks" ON "public"."task_reminders" FOR DELETE USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."organization_id" IN ( SELECT "tasks"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));


--
-- Name: profiles Users can delete their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own profile" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));


--
-- Name: tasks Users can delete their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own tasks" ON "public"."tasks" FOR DELETE USING ((("owner_id" = "auth"."uid"()) AND ("organization_id" IN ( SELECT "tasks"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));


--
-- Name: call_history Users can insert calls for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert calls for their organization" ON "public"."call_history" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: communications Users can insert communications for leads in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert communications for leads in their organization" ON "public"."communications" FOR INSERT WITH CHECK (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE ("leads"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = "auth"."uid"()))))));


--
-- Name: voice_usage Users can insert org voice usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org voice usage" ON "public"."voice_usage" FOR INSERT TO "authenticated" WITH CHECK (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: task_reminders Users can insert task reminders for their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert task reminders for their tasks" ON "public"."task_reminders" FOR INSERT WITH CHECK (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."owner_id" = "auth"."uid"()))));


--
-- Name: user_organizations Users can insert their own memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own memberships" ON "public"."user_organizations" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: user_notification_settings Users can insert their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notification settings" ON "public"."user_notification_settings" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: billing_settings Users can update billing settings (admins); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update billing settings (admins)" ON "public"."billing_settings" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."user_id" = "auth"."uid"()) AND (("user_organizations"."role")::"text" = 'admin'::"text")))));


--
-- Name: call_history Users can update calls from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update calls from their organization" ON "public"."call_history" FOR UPDATE USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: communications Users can update communications for leads in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update communications for leads in their organization" ON "public"."communications" FOR UPDATE USING (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE ("leads"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = "auth"."uid"()))))));


--
-- Name: task_reminders Users can update reminders for accessible tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update reminders for accessible tasks" ON "public"."task_reminders" FOR UPDATE USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."organization_id" IN ( SELECT "tasks"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));


--
-- Name: task_reminders Users can update task reminders for their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update task reminders for their tasks" ON "public"."task_reminders" FOR UPDATE USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."owner_id" = "auth"."uid"()))));


--
-- Name: user_notification_settings Users can update their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notification settings" ON "public"."user_notification_settings" FOR UPDATE USING (("user_id" = "auth"."uid"()));


--
-- Name: tasks Users can update their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tasks" ON "public"."tasks" FOR UPDATE USING ((("owner_id" = "auth"."uid"()) AND ("organization_id" IN ( SELECT "tasks"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));


--
-- Name: call_history Users can view calls from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view calls from their organization" ON "public"."call_history" FOR SELECT USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: communications Users can view communications for leads in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view communications for leads in their organization" ON "public"."communications" FOR SELECT USING (("lead_id" IN ( SELECT "leads"."id"
   FROM "public"."leads"
  WHERE ("leads"."organization_id" IN ( SELECT "user_organizations"."organization_id"
           FROM "public"."user_organizations"
          WHERE ("user_organizations"."user_id" = "auth"."uid"()))))));


--
-- Name: organization_invites Users can view invitations in their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invitations in their organizations" ON "public"."organization_invites" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_organizations"
  WHERE (("user_organizations"."organization_id" = "organization_invites"."organization_id") AND ("user_organizations"."user_id" = "auth"."uid"())))));


--
-- Name: organizations Users can view organizations they belong to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view organizations they belong to" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: task_reminders Users can view reminders for accessible tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reminders for accessible tasks" ON "public"."task_reminders" FOR SELECT USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."organization_id" IN ( SELECT "tasks"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));


--
-- Name: task_reminders Users can view task reminders for their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view task reminders for their tasks" ON "public"."task_reminders" FOR SELECT USING (("task_id" IN ( SELECT "tasks"."id"
   FROM "public"."tasks"
  WHERE ("tasks"."owner_id" = "auth"."uid"()))));


--
-- Name: tasks Users can view tasks from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tasks from their organization" ON "public"."tasks" FOR SELECT USING (("organization_id" IN ( SELECT "tasks"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));


--
-- Name: billing_settings Users can view their organization billing settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization billing settings" ON "public"."billing_settings" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: monthly_billing Users can view their organization monthly billing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization monthly billing" ON "public"."monthly_billing" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: voice_usage Users can view their organization voice usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization voice usage" ON "public"."voice_usage" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "user_organizations"."organization_id"
   FROM "public"."user_organizations"
  WHERE ("user_organizations"."user_id" = "auth"."uid"()))));


--
-- Name: user_organizations Users can view their own memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own memberships" ON "public"."user_organizations" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: user_notification_settings Users can view their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification settings" ON "public"."user_notification_settings" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: notifications notifications_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications_owner_read" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: task_reminders reminders_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reminders_owner_read" ON "public"."task_reminders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tasks" "t"
  WHERE (("t"."id" = "task_reminders"."task_id") AND ("t"."owner_id" = "auth"."uid"())))));


--
-- Name: tasks tasks_owner_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "tasks_owner_rw" ON "public"."tasks" USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE "realtime"."messages" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Authenticated users can upload to avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Authenticated users can upload to avatars" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'avatars'::"text") AND ("auth"."role"() = 'authenticated'::"text")));


--
-- Name: objects Only owner can delete their avatar; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Only owner can delete their avatar" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'avatars'::"text") AND (("metadata" ->> 'user_id'::"text") = ("auth"."uid"())::"text")));


--
-- Name: objects Public read access to avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Public read access to avatars" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'avatars'::"text"));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."prefixes" ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION "supabase_realtime" WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION "supabase_realtime_messages_publication" WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime notifications; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION "supabase_realtime_messages_publication" ADD TABLE ONLY "realtime"."messages";


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_graphql_placeholder" ON "sql_drop"
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION "extensions"."set_graphql_placeholder"();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_pg_cron_access" ON "ddl_command_end"
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION "extensions"."grant_pg_cron_access"();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_pg_graphql_access" ON "ddl_command_end"
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION "extensions"."grant_pg_graphql_access"();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "issue_pg_net_access" ON "ddl_command_end"
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION "extensions"."grant_pg_net_access"();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "pgrst_ddl_watch" ON "ddl_command_end"
   EXECUTE FUNCTION "extensions"."pgrst_ddl_watch"();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER "pgrst_drop_watch" ON "sql_drop"
   EXECUTE FUNCTION "extensions"."pgrst_drop_watch"();


--
-- PostgreSQL database dump complete
--

\unrestrict aCkYpT1tywQTInebgJqOKtPigMHO7zyzmtKTMEXcxAprdixRcYlRgc0HDPm2xTE

