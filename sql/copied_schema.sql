--
-- PostgreSQL database dump
--

\restrict 9Hb8wlFvLrmSajEWq1ngxyEdiRILF1jeMeQinO1eMao4Y9V8Ijj6kdiJaOfZXgt

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

CREATE SCHEMA auth;


--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: investigator_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.investigator_role AS ENUM (
    'admin',
    'analyst',
    'viewer'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
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

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
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

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
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
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
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
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
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
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
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

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
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

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
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
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: add_wallet_funds(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_wallet_funds(p_org_id uuid, p_amount_cents integer, p_description text DEFAULT 'Wallet top-up'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance BIGINT;
BEGIN
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_amount',
      'message', 'Amount must be positive'
    );
  END IF;

  -- Lock or create wallet
  SELECT id INTO v_wallet_id
  FROM public.usage_wallets
  WHERE organization_id = p_org_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.usage_wallets (organization_id, balance_cents)
    VALUES (p_org_id, p_amount_cents)
    RETURNING id, balance_cents INTO v_wallet_id, v_new_balance;
  ELSE
    UPDATE public.usage_wallets
    SET 
      balance_cents = balance_cents + p_amount_cents,
      updated_at = NOW()
    WHERE id = v_wallet_id
    RETURNING balance_cents INTO v_new_balance;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'wallet_id', v_wallet_id,
    'added_cents', p_amount_cents,
    'added_dollars', ROUND(p_amount_cents / 100.0, 2),
    'added_credits', FLOOR(p_amount_cents / 20.0),
    'new_balance_cents', v_new_balance,
    'new_balance_credits', FLOOR(v_new_balance / 20.0)
  ) || public.get_org_credits(p_org_id);
END;
$$;


--
-- Name: adjust_chat_messages_for_seat_change(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adjust_chat_messages_for_seat_change(p_org_id uuid, p_seat_delta integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_messages_per_seat integer;
  v_message_delta integer;
  v_old_monthly integer;
  v_old_remaining integer;
  v_new_monthly integer;
  v_new_remaining integer;
BEGIN
  -- Get messages per seat
  v_messages_per_seat := public.get_chat_messages_per_extra_seat();
  v_message_delta := p_seat_delta * v_messages_per_seat;

  -- Get current state
  SELECT 
    included_chat_messages_monthly,
    chat_messages_remaining
  INTO v_old_monthly, v_old_remaining
  FROM organizations
  WHERE id = p_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  -- Calculate new values
  v_new_monthly := GREATEST(0, v_old_monthly + v_message_delta);
  
  IF p_seat_delta > 0 THEN
    -- Adding seats: add messages immediately
    v_new_remaining := v_old_remaining + v_message_delta;
  ELSE
    -- Removing seats: reduce monthly but don't reduce remaining below 0
    v_new_remaining := GREATEST(0, LEAST(v_old_remaining, v_new_monthly));
  END IF;

  -- Update organization
  UPDATE organizations
  SET
    included_chat_messages_monthly = v_new_monthly,
    chat_messages_remaining = v_new_remaining,
    updated_at = now()
  WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'old_monthly', v_old_monthly,
    'new_monthly', v_new_monthly,
    'old_remaining', v_old_remaining,
    'new_remaining', v_new_remaining,
    'seat_delta', p_seat_delta,
    'message_delta', v_message_delta
  );
END;
$$;


--
-- Name: adjust_credits_for_seat_change(uuid, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adjust_credits_for_seat_change(p_org_id uuid, p_seat_delta integer, p_immediate boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_credits_per_seat integer;
  v_credit_delta integer;
  v_current_remaining integer;
  v_new_remaining integer;
  v_current_extra_seats integer;
BEGIN
  -- Get credits per seat
  v_credits_per_seat := public.get_credits_per_extra_seat();
  v_credit_delta := p_seat_delta * v_credits_per_seat;

  -- Get current state
  SELECT COALESCE(included_credits_remaining, 0)
  INTO v_current_remaining
  FROM public.organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'org_not_found',
      'message', 'Organization not found'
    );
  END IF;

  -- Get current extra seat count (before this change was recorded)
  v_current_extra_seats := public.get_extra_seat_count(p_org_id);

  IF p_immediate THEN
    IF v_credit_delta > 0 THEN
      -- ADDING seats: Grant credits immediately
      v_new_remaining := v_current_remaining + v_credit_delta;

      UPDATE public.organizations
      SET
        included_credits_remaining = v_new_remaining,
        updated_at = now()
      WHERE id = p_org_id;

    ELSIF v_credit_delta < 0 THEN
      -- REMOVING seats: Check if we have enough credits
      v_new_remaining := v_current_remaining + v_credit_delta;

      IF v_new_remaining < 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'insufficient_credits_for_removal',
          'message', 'Cannot remove seats immediately - insufficient credits remaining',
          'current_remaining', v_current_remaining,
          'credits_to_remove', ABS(v_credit_delta),
          'shortfall', ABS(v_new_remaining),
          'suggestion', 'Set immediate=false to defer removal to next billing cycle'
        );
      END IF;

      UPDATE public.organizations
      SET
        included_credits_remaining = v_new_remaining,
        updated_at = now()
      WHERE id = p_org_id;
    ELSE
      v_new_remaining := v_current_remaining;
    END IF;
  ELSE
    -- DEFERRED: Don't touch credits now, monthly reset will handle it
    v_new_remaining := v_current_remaining;
  END IF;

  -- Log the seat credit change
  INSERT INTO public.subscription_ledger (
    org_id, event, from_plan, to_plan, proration_cents, raw, occurred_at
  ) VALUES (
    p_org_id,
    'extra_seats_credit_adjustment',
    v_current_extra_seats::text,
    (v_current_extra_seats + p_seat_delta)::text,
    0,
    jsonb_build_object(
      'seat_delta', p_seat_delta,
      'credits_per_seat', v_credits_per_seat,
      'credit_delta', v_credit_delta,
      'old_remaining', v_current_remaining,
      'new_remaining', v_new_remaining,
      'immediate', p_immediate
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'seat_delta', p_seat_delta,
    'credits_per_seat', v_credits_per_seat,
    'credit_delta', v_credit_delta,
    'old_remaining', v_current_remaining,
    'new_remaining', v_new_remaining,
    'immediate', p_immediate
  ) || public.get_org_credits(p_org_id);
END;
$$;


--
-- Name: admin_adjust_credits(uuid, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_adjust_credits(p_org_id uuid, p_adjustment integer, p_reason text, p_admin_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old_remaining integer;
  v_new_remaining integer;
BEGIN
  SELECT COALESCE(included_credits_remaining, 0)
  INTO v_old_remaining
  FROM public.organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'org_not_found',
      'message', 'Organization not found'
    );
  END IF;

  v_new_remaining := GREATEST(0, v_old_remaining + p_adjustment);

  UPDATE public.organizations
  SET
    included_credits_remaining = v_new_remaining,
    updated_at = now()
  WHERE id = p_org_id;

  -- Log the adjustment
  INSERT INTO public.subscription_ledger (
    org_id, event, from_plan, to_plan, proration_cents, raw, occurred_at
  ) VALUES (
    p_org_id,
    'admin_credit_adjustment',
    v_old_remaining::text,
    v_new_remaining::text,
    0,
    jsonb_build_object(
      'old_remaining', v_old_remaining,
      'new_remaining', v_new_remaining,
      'adjustment', p_adjustment,
      'reason', p_reason,
      'admin_user_id', p_admin_user_id,
      'adjusted_at', now()
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_remaining', v_old_remaining,
    'new_remaining', v_new_remaining,
    'adjustment', p_adjustment,
    'reason', p_reason
  ) || public.get_org_credits(p_org_id);
END;
$$;


--
-- Name: audit_row_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_row_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_actor uuid;
    v_org uuid;
    v_row_id uuid;
    j jsonb;
BEGIN
    -- Capture authed user if available (Supabase helper)
    BEGIN
        v_actor := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_actor := NULL;
    END;

    -- Try to infer organization_id from NEW, else OLD
    IF TG_OP <> 'DELETE' THEN
        j := to_jsonb(NEW);
        IF j ? 'organization_id' THEN
            v_org := (j ->> 'organization_id')::uuid;
        END IF;
    END IF;
    IF v_org IS NULL AND TG_OP <> 'INSERT' THEN
        j := to_jsonb(OLD);
        IF j ? 'organization_id' THEN
            v_org := (j ->> 'organization_id')::uuid;
        END IF;
    END IF;

    -- Try to infer row uuid id if present
    IF TG_OP <> 'DELETE' THEN
        j := to_jsonb(NEW);
        IF j ? 'id' THEN
            v_row_id := (j ->> 'id')::uuid;
        END IF;
    ELSE
        j := to_jsonb(OLD);
        IF j ? 'id' THEN
            v_row_id := (j ->> 'id')::uuid;
        END IF;
    END IF;

    INSERT INTO public.audit_log(table_name, row_id, action, actor_id, organization_id, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        v_row_id,
        TG_OP,
        v_actor,
        v_org,
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: calculate_call_duration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_call_duration() RETURNS trigger
    LANGUAGE plpgsql
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
-- Name: calculate_usage_cost(character varying, character varying, character varying, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_usage_cost(p_service_type character varying, p_country_code character varying, p_pricing_type character varying, p_units numeric, p_organization_id uuid DEFAULT NULL::uuid) RETURNS TABLE(twilio_cost numeric, markup_amount numeric, total_cost numeric, markup_percentage numeric)
    LANGUAGE plpgsql
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
-- Name: case_default_assignee(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.case_default_assignee() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.assigned_to IS NULL OR array_length(NEW.assigned_to, 1) IS NULL OR array_length(NEW.assigned_to, 1) = 0 THEN
    IF NEW.created_by IS NOT NULL THEN
      NEW.assigned_to := ARRAY[NEW.created_by]::text[];
    ELSE
      NEW.assigned_to := ARRAY[]::text[];
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: cases_null_on_business_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cases_null_on_business_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE public.cases
     SET subject_id = NULL, subject_type = NULL
   WHERE subject_type = 'business' AND subject_id = OLD.id;
  RETURN OLD;
END; $$;


--
-- Name: cases_null_on_person_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cases_null_on_person_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE public.cases
     SET subject_id = NULL, subject_type = NULL
   WHERE subject_type = 'person' AND subject_id = OLD.id;
  RETURN OLD;
END; $$;


--
-- Name: catalog_before_write(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.catalog_before_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.name := public.normalize_catalog_name(NEW.name);
  RETURN NEW;
END;
$$;


--
-- Name: change_org_tier(uuid, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.change_org_tier(p_org_id uuid, p_new_monthly_credits integer, p_prorate boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old_monthly integer;
  v_old_remaining integer;
  v_used_this_month integer;
  v_new_remaining integer;
  v_extra_seats integer;
  v_extra_seat_credits integer;
BEGIN
  -- Get current state
  SELECT
    COALESCE(included_credits_monthly, 0),
    COALESCE(included_credits_remaining, 0)
  INTO v_old_monthly, v_old_remaining
  FROM public.organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'org_not_found',
      'message', 'Organization not found'
    );
  END IF;

  -- Get extra seat info (calculated from seat_events)
  v_extra_seats := public.get_extra_seat_count(p_org_id);
  v_extra_seat_credits := v_extra_seats * public.get_credits_per_extra_seat();

  -- Calculate used this month (base tier only)
  v_used_this_month := GREATEST(0, v_old_monthly - v_old_remaining);

  IF p_prorate THEN
    -- UPGRADE: Give new tier credits minus usage
    v_new_remaining := GREATEST(0, p_new_monthly_credits - v_used_this_month);

    UPDATE public.organizations
    SET
      included_credits_monthly = p_new_monthly_credits,
      included_credits_remaining = v_new_remaining,
      updated_at = now()
    WHERE id = p_org_id;
  ELSE
    -- DOWNGRADE: Only update monthly, let reset handle remaining at next cycle
    v_new_remaining := v_old_remaining;

    UPDATE public.organizations
    SET
      included_credits_monthly = p_new_monthly_credits,
      updated_at = now()
    WHERE id = p_org_id;
  END IF;

  -- Log the tier change
  INSERT INTO public.subscription_ledger (
    org_id, event, from_plan, to_plan, proration_cents, raw, occurred_at
  ) VALUES (
    p_org_id,
    'tier_change_credits',
    v_old_monthly::text,
    p_new_monthly_credits::text,
    0,
    jsonb_build_object(
      'old_monthly', v_old_monthly,
      'new_monthly', p_new_monthly_credits,
      'old_remaining', v_old_remaining,
      'new_remaining', v_new_remaining,
      'used_this_month', v_used_this_month,
      'prorated', p_prorate,
      'extra_seats', v_extra_seats,
      'extra_seat_credits', v_extra_seat_credits
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_monthly', v_old_monthly,
    'new_monthly', p_new_monthly_credits,
    'old_remaining', v_old_remaining,
    'new_remaining', v_new_remaining,
    'used_this_month', v_used_this_month,
    'prorated', p_prorate,
    'extra_seats', v_extra_seats,
    'extra_seat_credits', v_extra_seat_credits
  ) || public.get_org_credits(p_org_id);
END;
$$;


--
-- Name: check_subscription_refund_eligibility(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_subscription_refund_eligibility(p_org_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_org RECORD;
  v_latest_invoice RECORD;
  v_days_since_charge integer;
  v_usage_percent numeric;
  v_refunds_90d integer;
  v_refund_amount_cents integer;
  v_account_age_days integer;
  v_has_disputes boolean := false;
  v_eligible boolean := true;
  v_denial_reasons text[] := '{}';
BEGIN
  -- Get organization info
  SELECT 
    o.*,
    pc.included_credits,
    pc.base_price_cents as price_cents
  INTO v_org
  FROM public.organizations o
  LEFT JOIN public.plan_catalog pc ON pc.plan_code = o.plan_code AND pc.env = 
    CASE WHEN current_setting('app.environment', true) = 'production' THEN 'live' ELSE 'test' END
  WHERE o.id = p_org_id;

  IF v_org IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Organization not found');
  END IF;

  -- Calculate account age (IMPORTANT for fraud prevention)
  v_account_age_days := EXTRACT(DAY FROM (now() - v_org.created_at));

  -- Block very new accounts (< 7 days) - flag for manual review
  IF v_account_age_days < 7 THEN
    v_eligible := false;
    v_denial_reasons := array_append(v_denial_reasons, format('Account is only %s days old - requires manual review (min 7 days)', v_account_age_days));
  END IF;

  -- Get latest paid invoice
  SELECT 
    si.*,
    EXTRACT(DAY FROM (now() - COALESCE(si.paid_at, si.created_at))) AS days_since
  INTO v_latest_invoice
  FROM public.stripe_invoices si
  WHERE si.org_id = p_org_id
    AND si.status = 'paid'
    AND si.amount_paid > 0
  ORDER BY si.paid_at DESC NULLS LAST, si.created_at DESC
  LIMIT 1;

  IF v_latest_invoice IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false, 
      'reason', 'No paid invoices found',
      'accountAgeDays', v_account_age_days
    );
  END IF;

  v_days_since_charge := COALESCE(v_latest_invoice.days_since, 999);

  -- Calculate usage percentage
  -- included_credits_remaining vs included_credits (from plan)
  IF COALESCE(v_org.included_credits, 0) > 0 THEN
    v_usage_percent := 100.0 * (1.0 - (COALESCE(v_org.included_credits_remaining, 0)::numeric / v_org.included_credits::numeric));
  ELSE
    v_usage_percent := 0;
  END IF;

  -- Count refunds in last 90 days
  SELECT COUNT(*) INTO v_refunds_90d
  FROM public.refund_requests rr
  WHERE rr.organization_id = p_org_id
    AND rr.status IN ('approved', 'processed')
    AND rr.refund_type = 'subscription'
    AND rr.processed_at > now() - INTERVAL '90 days';

  -- Check eligibility rules

  -- Rule 1: Within 5 days of charge (stricter than before)
  IF v_days_since_charge > 5 THEN
    v_eligible := false;
    v_denial_reasons := array_append(v_denial_reasons, format('More than 5 days since charge (%s days)', v_days_since_charge));
  END IF;

  -- Rule 2: Less than 10% usage (stricter than before)
  IF v_usage_percent >= 10 THEN
    v_eligible := false;
    v_denial_reasons := array_append(v_denial_reasons, format('Credit usage exceeds 10%% (%.1f%%)', v_usage_percent));
  END IF;

  -- Rule 3: Max 2 refunds in last 90 days
  IF v_refunds_90d >= 2 THEN
    v_eligible := false;
    v_denial_reasons := array_append(v_denial_reasons, format('Already received %s refunds in the last 90 days (max 2)', v_refunds_90d));
  END IF;

  -- Rule 4: Check for open disputes
  SELECT EXISTS (
    SELECT 1 FROM public.stripe_charges sc
    WHERE sc.organization_id = p_org_id
      AND sc.disputed = true
  ) INTO v_has_disputes;

  IF v_has_disputes THEN
    v_eligible := false;
    v_denial_reasons := array_append(v_denial_reasons, 'Open payment dispute on account');
  END IF;

  -- Calculate refund amount (pro-rated by unused credits)
  IF v_org.included_credits > 0 THEN
    v_refund_amount_cents := ROUND(
      v_latest_invoice.amount_paid * (COALESCE(v_org.included_credits_remaining, 0)::numeric / v_org.included_credits::numeric)
    );
  ELSE
    v_refund_amount_cents := v_latest_invoice.amount_paid;
  END IF;

  -- Minimum refund check
  IF v_refund_amount_cents < 100 THEN -- $1 minimum
    v_eligible := false;
    v_denial_reasons := array_append(v_denial_reasons, 'Refund amount too small (less than $1)');
  END IF;

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'refund_amount_cents', v_refund_amount_cents,
    'refund_amount_dollars', ROUND(v_refund_amount_cents / 100.0, 2),
    'original_amount_cents', v_latest_invoice.amount_paid,
    'stripe_invoice_id', v_latest_invoice.stripe_invoice_id,
    'stripe_charge_id', v_latest_invoice.stripe_charge_id,
    'days_since_charge', v_days_since_charge,
    'usage_percent', ROUND(v_usage_percent, 1),
    'credits_used', COALESCE(v_org.included_credits, 0) - COALESCE(v_org.included_credits_remaining, 0),
    'credits_remaining', COALESCE(v_org.included_credits_remaining, 0),
    'credits_total', COALESCE(v_org.included_credits, 0),
    'refunds_90d', v_refunds_90d,
    'account_age_days', v_account_age_days,
    'has_open_disputes', v_has_disputes,
    'denial_reasons', v_denial_reasons,
    'requires_manual_review', NOT v_eligible AND v_refund_amount_cents >= 10000 -- $100+
  );
END;
$_$;


--
-- Name: check_wallet_refund_eligibility(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_wallet_refund_eligibility(p_org_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_wallet RECORD;
  v_total_deposited_cents bigint;
  v_total_spent_cents bigint;
  v_refundable_cents bigint;
BEGIN
  -- Get wallet info
  SELECT * INTO v_wallet
  FROM public.usage_wallets
  WHERE organization_id = p_org_id;

  IF v_wallet IS NULL OR v_wallet.balance_cents <= 0 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'No wallet balance to refund',
      'balance_cents', COALESCE(v_wallet.balance_cents, 0)
    );
  END IF;

  -- Calculate total deposited (from successful top-ups)
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_deposited_cents
  FROM public.usage_transactions
  WHERE wallet_id = v_wallet.id
    AND transaction_type = 'deposit'
    AND direction = 'credit';

  -- Calculate total spent
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_spent_cents
  FROM public.usage_transactions
  WHERE wallet_id = v_wallet.id
    AND transaction_type = 'spend'
    AND direction = 'debit';

  -- Refundable is current balance (what's left)
  v_refundable_cents := v_wallet.balance_cents;

  -- Check for open disputes
  IF EXISTS (
    SELECT 1 FROM public.stripe_charges sc
    WHERE sc.organization_id = p_org_id
      AND sc.status = 'disputed'
  ) THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'Open payment dispute on account',
      'balance_cents', v_wallet.balance_cents
    );
  END IF;

  -- Minimum refund check
  IF v_refundable_cents < 100 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'Refund amount too small (less than $1)',
      'balance_cents', v_wallet.balance_cents,
      'refundable_cents', v_refundable_cents
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'refund_amount_cents', v_refundable_cents,
    'refund_amount_dollars', ROUND(v_refundable_cents / 100.0, 2),
    'wallet_balance_cents', v_wallet.balance_cents,
    'total_deposited_cents', v_total_deposited_cents,
    'total_spent_cents', v_total_spent_cents
  );
END;
$_$;


--
-- Name: check_webhook_idempotency(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_webhook_idempotency(p_stripe_event_id text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.stripe_webhook_events
    WHERE stripe_event_id = p_stripe_event_id
    AND status IN ('processed', 'failed', 'skipped')
  );
$$;


--
-- Name: cleanup_old_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_notifications() RETURNS void
    LANGUAGE plpgsql
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

CREATE FUNCTION public.create_automatic_notification() RETURNS trigger
    LANGUAGE plpgsql
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
-- Name: create_organization_with_admin(text, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_organization_with_admin(org_name text, max_seats integer, owner_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
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

CREATE FUNCTION public.create_task_reminder() RETURNS trigger
    LANGUAGE plpgsql
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
-- Name: create_task_with_reminders(uuid, uuid, text, text, timestamp with time zone, text, integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_task_with_reminders(_owner uuid, _organization uuid, _title text, _description text, _due_at timestamp with time zone, _due_timezone text, _offsets_minutes integer[]) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
-- Name: credit_back_action(uuid, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.credit_back_action(p_org_id uuid, p_action_key text, p_credits integer, p_reason text DEFAULT 'Action failed or returned invalid results'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_refund_id uuid;
BEGIN
  -- Add credits back to included_credits_remaining
  UPDATE public.organizations
  SET included_credits_remaining = COALESCE(included_credits_remaining, 0) + p_credits
  WHERE id = p_org_id;

  -- Record the credit-back as a refund request for audit
  INSERT INTO public.refund_requests (
    organization_id,
    refund_type,
    status,
    original_amount_cents,
    refund_amount_cents,
    credits_refunded,
    auto_eligible,
    reason,
    processed_at
  ) VALUES (
    p_org_id,
    'action_credit',
    'processed',
    0,
    0,
    p_credits,
    true,
    p_reason || ' (Action: ' || p_action_key || ')',
    now()
  )
  RETURNING id INTO v_refund_id;

  RETURN jsonb_build_object(
    'success', true,
    'credits_refunded', p_credits,
    'refund_id', v_refund_id
  );
END;
$$;


--
-- Name: delete_case_category(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_case_category(p_org uuid, p_name text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_name text := public.normalize_catalog_name(p_name);
BEGIN
  -- clear from cases
  UPDATE public.cases
  SET category = NULL
  WHERE organization_id = p_org
    AND category IS NOT NULL
    AND public.normalize_catalog_name(category) = v_name;

  -- remove from catalog
  DELETE FROM public.case_category_catalog
  WHERE organization_id = p_org AND public.normalize_catalog_name(name) = v_name;
END;
$$;


--
-- Name: delete_case_tag(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_case_tag(p_org uuid, p_name text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_name text := public.normalize_catalog_name(p_name);
BEGIN
  -- remove tag from cases
  UPDATE public.cases
  SET tags = (
    SELECT COALESCE(array_agg(t) FILTER (WHERE public.normalize_catalog_name(t) <> v_name), '{}')
    FROM unnest(tags) AS t
  )
  WHERE organization_id = p_org AND tags IS NOT NULL;

  -- remove from catalog
  DELETE FROM public.case_tag_catalog
  WHERE organization_id = p_org AND public.normalize_catalog_name(name) = v_name;
END;
$$;


--
-- Name: deliver_due_task_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deliver_due_task_reminders() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
-- Name: find_missing_subscription_webhooks(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_missing_subscription_webhooks(p_org_id uuid) RETURNS TABLE(expected_event text, last_seen timestamp with time zone, days_ago numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH expected AS (
    SELECT unnest(ARRAY[
      'customer.subscription.created',
      'customer.subscription.updated', 
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed'
    ]) AS event_type
  ),
  last_seen AS (
    SELECT event_type, MAX(received_at) AS last_received
    FROM public.stripe_webhook_events
    WHERE org_id = p_org_id
    GROUP BY event_type
  )
  SELECT 
    e.event_type AS expected_event,
    ls.last_received AS last_seen,
    EXTRACT(EPOCH FROM (now() - ls.last_received)) / 86400 AS days_ago
  FROM expected e
  LEFT JOIN last_seen ls ON e.event_type = ls.event_type
  WHERE ls.last_received IS NULL OR ls.last_received < now() - INTERVAL '30 days';
$$;


--
-- Name: get_chat_message_limit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_chat_message_limit(p_org_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_limit INTEGER;
BEGIN
    SELECT included_chat_messages_monthly INTO v_limit 
    FROM organizations 
    WHERE id = p_org_id;
    
    RETURN COALESCE(v_limit, 500); -- Default if null
END;
$$;


--
-- Name: get_chat_messages_per_extra_seat(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_chat_messages_per_extra_seat() RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT 125;  -- Each extra seat grants 125 chat messages/month
$$;


--
-- Name: get_chat_messages_remaining(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_chat_messages_remaining(p_org_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    SELECT chat_messages_remaining INTO v_remaining 
    FROM organizations 
    WHERE id = p_org_id;
    
    RETURN COALESCE(v_remaining, 0);
END;
$$;


--
-- Name: get_chat_sessions_with_preview(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_chat_sessions_with_preview(p_org_id uuid, p_limit integer DEFAULT 50) RETURNS TABLE(id uuid, title text, summary text, status text, pinned boolean, message_count integer, file_count integer, last_message text, last_message_at timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.title,
        cs.summary,
        cs.status,
        cs.pinned,
        cs.message_count,
        cs.file_count,
        (
            SELECT cm.content 
            FROM chat_messages cm 
            WHERE cm.session_id = cs.id AND cm.role = 'user'
            ORDER BY cm.created_at DESC 
            LIMIT 1
        ) AS last_message,
        cs.last_message_at,
        cs.created_at
    FROM chat_sessions cs
    WHERE cs.organization_id = p_org_id
      AND cs.status = 'active'
    ORDER BY cs.pinned DESC, cs.last_message_at DESC NULLS LAST
    LIMIT p_limit;
END;
$$;


--
-- Name: get_credits_per_extra_seat(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_credits_per_extra_seat() RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT 150;  -- Each extra seat grants 150 credits/month (was 225)
$$;


--
-- Name: get_due_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_due_reminders() RETURNS TABLE(id uuid, task_id uuid, task_title text, due_date timestamp with time zone, reminder_time timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
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
-- Name: get_extra_seat_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_extra_seat_count(p_org_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(SUM(delta), 0)::integer
  FROM public.seat_events
  WHERE org_id = p_org_id;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: chat_usage_monthly; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_usage_monthly (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    month_key text NOT NULL,
    message_count integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    total_cost_usd numeric(10,6) DEFAULT 0 NOT NULL,
    credits_charged numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: get_or_create_chat_usage(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_chat_usage(p_org_id uuid, p_month_key text) RETURNS public.chat_usage_monthly
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_record chat_usage_monthly;
BEGIN
    SELECT * INTO v_record
    FROM chat_usage_monthly
    WHERE organization_id = p_org_id AND month_key = p_month_key;
    
    IF NOT FOUND THEN
        INSERT INTO chat_usage_monthly (organization_id, month_key)
        VALUES (p_org_id, p_month_key)
        RETURNING * INTO v_record;
    END IF;
    
    RETURN v_record;
END;
$$;


--
-- Name: get_org_billing_history(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_org_billing_history(p_org_id uuid, p_limit integer DEFAULT 50) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT jsonb_build_object(
    'org_id', p_org_id,
    'subscription_events', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', sl.id,
          'event', sl.event,
          'from_plan', sl.from_plan,
          'to_plan', sl.to_plan,
          'proration_cents', sl.proration_cents,
          'occurred_at', sl.occurred_at,
          'details', sl.raw
        ) ORDER BY sl.occurred_at DESC
      ), '[]'::jsonb)
      FROM public.subscription_ledger sl
      WHERE sl.org_id = p_org_id
      LIMIT p_limit
    ),
    'usage_events', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ue.id,
          'category', ue.category,
          'credit_cost', ue.credit_cost,
          'from_included', ue.from_included_credits,
          'from_wallet', ue.from_wallet_credits,
          'created_at', ue.created_at
        ) ORDER BY ue.created_at DESC
      ), '[]'::jsonb)
      FROM public.usage_events ue
      WHERE ue.org_id = p_org_id
        AND COALESCE(ue.is_duplicate, false) = false
      LIMIT p_limit
    ),
    'seat_events', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', se.id,
          'action', se.action,
          'delta', se.delta,
          'reason', se.reason,
          'created_at', se.created_at
        ) ORDER BY se.created_at DESC
      ), '[]'::jsonb)
      FROM public.seat_events se
      WHERE se.org_id = p_org_id
      LIMIT p_limit
    ),
    'current_state', public.get_org_credits(p_org_id),
    'extra_seats', public.get_extra_seat_count(p_org_id)
  );
$$;


--
-- Name: get_org_credit_balance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_org_credit_balance(p_org_id uuid) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select jsonb_build_object(
    'ok', true,
    'org_id', b.org_id,
    'included_credits_remaining', b.included_credits_remaining,
    'wallet_balance_cents', b.wallet_balance_cents,
    'wallet_credits_remaining', b.wallet_credits_remaining,
    'total_credits_remaining', b.total_credits_remaining
  )
  from public.org_credit_balance b
  where b.org_id = p_org_id;
$$;


--
-- Name: get_org_credit_usage_month(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_org_credit_usage_month(p_org_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH month_window AS (
    SELECT
      date_trunc('month', NOW()) AS start_at,
      date_trunc('month', NOW()) + INTERVAL '1 month' AS end_at
  ),
  usage_summary AS (
    SELECT
      COALESCE(SUM(credit_cost), 0)::INTEGER AS total_credits_spent,
      COALESCE(SUM(from_included_credits), 0)::INTEGER AS from_included,
      COALESCE(SUM(from_wallet_credits), 0)::INTEGER AS from_wallet,
      COALESCE(SUM(wallet_debit_cents), 0)::INTEGER AS wallet_spent_cents,
      COUNT(*)::INTEGER AS event_count
    FROM public.usage_events ue
    CROSS JOIN month_window mw
    WHERE ue.org_id = p_org_id
      AND ue.created_at >= mw.start_at
      AND ue.created_at < mw.end_at
      AND COALESCE(ue.is_duplicate, FALSE) = FALSE
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'start', (SELECT start_at FROM month_window),
      'end', (SELECT end_at FROM month_window)
    ),
    'total_credits_spent', us.total_credits_spent,
    'from_included_credits', us.from_included,
    'from_wallet_credits', us.from_wallet,
    'wallet_spent_cents', us.wallet_spent_cents,
    'wallet_spent_dollars', ROUND(us.wallet_spent_cents / 100.0, 2),
    'event_count', us.event_count
  )
  FROM usage_summary us;
$$;


--
-- Name: get_org_credits(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_org_credits(p_org_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT jsonb_build_object(
    'org_id', b.org_id,
    'included_monthly', b.included_monthly,
    'included_remaining', b.included_remaining,
    'wallet_balance_cents', b.wallet_balance_cents,
    'wallet_remaining', b.wallet_remaining,
    'remaining_total', b.remaining_total,
    'needs_topup', b.remaining_total < 1
  )
  FROM public.org_credit_balance b
  WHERE b.org_id = p_org_id;
$$;


--
-- Name: get_webhook_history(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_webhook_history(p_org_id uuid, p_limit integer DEFAULT 100, p_event_type text DEFAULT NULL::text) RETURNS TABLE(id uuid, stripe_event_id text, event_type text, status text, received_at timestamp with time zone, processed_at timestamp with time zone, processing_error text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    sw.id,
    sw.stripe_event_id,
    sw.event_type,
    sw.status,
    sw.received_at,
    sw.processed_at,
    sw.processing_error
  FROM public.stripe_webhook_events sw
  WHERE sw.org_id = p_org_id
    AND (p_event_type IS NULL OR sw.event_type = p_event_type)
  ORDER BY sw.received_at DESC
  LIMIT p_limit;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
   begin
     insert into public.profiles (id)
     values (new.id);
     return new;
   end;
   $$;


--
-- Name: handle_task_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_task_reminders() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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
-- Name: increment_chat_usage(uuid, text, integer, integer, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_chat_usage(p_org_id uuid, p_month_key text, p_messages integer DEFAULT 1, p_tokens integer DEFAULT 0, p_cost_usd numeric DEFAULT 0, p_credits numeric DEFAULT 0) RETURNS public.chat_usage_monthly
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_record chat_usage_monthly;
BEGIN
    INSERT INTO chat_usage_monthly (organization_id, month_key, message_count, total_tokens, total_cost_usd, credits_charged)
    VALUES (p_org_id, p_month_key, p_messages, p_tokens, p_cost_usd, p_credits)
    ON CONFLICT (organization_id, month_key)
    DO UPDATE SET
        message_count = chat_usage_monthly.message_count + p_messages,
        total_tokens = chat_usage_monthly.total_tokens + p_tokens,
        total_cost_usd = chat_usage_monthly.total_cost_usd + p_cost_usd,
        credits_charged = chat_usage_monthly.credits_charged + p_credits,
        updated_at = now()
    RETURNING * INTO v_record;
    
    RETURN v_record;
END;
$$;


--
-- Name: increment_webhook_failures(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_webhook_failures(p_org_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  UPDATE public.organizations
  SET stripe_webhook_failures = COALESCE(stripe_webhook_failures, 0) + 1
  WHERE id = p_org_id;
$$;


--
-- Name: is_org_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_org_member(org_id uuid, profile_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM investigators
    WHERE organization_id = org_id
      AND profile_id = profile_id
  );
$$;


--
-- Name: is_organization_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_organization_owner(org_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organizations 
        WHERE id = org_id AND owner_id = auth.uid()
    );
END;
$$;


--
-- Name: is_webhook_processed(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_webhook_processed(p_stripe_event_id text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.stripe_webhook_events
    WHERE stripe_event_id = p_stripe_event_id
    AND status = 'processed'
  );
$$;


--
-- Name: log_payment_failure(uuid, text, text, text, text, text, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_payment_failure(p_org_id uuid, p_invoice_id text DEFAULT NULL::text, p_charge_id text DEFAULT NULL::text, p_payment_intent_id text DEFAULT NULL::text, p_failure_code text DEFAULT NULL::text, p_failure_message text DEFAULT NULL::text, p_decline_code text DEFAULT NULL::text, p_next_action text DEFAULT NULL::text, p_stripe_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id uuid;
  v_attempt_count integer;
BEGIN
  -- Check if there's an existing failure for this invoice/charge to increment attempt count
  SELECT attempt_count INTO v_attempt_count
  FROM public.stripe_payment_failures
  WHERE (stripe_invoice_id = p_invoice_id OR stripe_charge_id = p_charge_id)
    AND organization_id = p_org_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  v_attempt_count := COALESCE(v_attempt_count, 0) + 1;
  
  INSERT INTO public.stripe_payment_failures (
    organization_id,
    stripe_invoice_id,
    stripe_charge_id,
    stripe_payment_intent_id,
    failure_code,
    failure_message,
    decline_code,
    next_action,
    attempt_count,
    stripe_created_at
  ) VALUES (
    p_org_id,
    p_invoice_id,
    p_charge_id,
    p_payment_intent_id,
    p_failure_code,
    p_failure_message,
    p_decline_code,
    p_next_action,
    v_attempt_count,
    p_stripe_created_at
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


--
-- Name: log_subscription_ledger_event(uuid, text, text, integer, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_subscription_ledger_event(p_org_id uuid, p_event_type text, p_description text, p_amount_cents integer DEFAULT NULL::integer, p_balance_impact text DEFAULT 'none'::text, p_metadata jsonb DEFAULT NULL::jsonb, p_stripe_event_id text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.stripe_subscription_ledger (
    organization_id,
    event_type,
    description,
    amount_cents,
    balance_impact,
    metadata,
    stripe_event_id
  ) VALUES (
    p_org_id,
    p_event_type,
    p_description,
    p_amount_cents,
    p_balance_impact,
    p_metadata,
    p_stripe_event_id
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


--
-- Name: log_webhook_event(text, text, text, uuid, text, text, text, jsonb, text, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_webhook_event(p_stripe_event_id text, p_event_type text, p_status text, p_org_id uuid DEFAULT NULL::uuid, p_stripe_api_version text DEFAULT NULL::text, p_stripe_customer_id text DEFAULT NULL::text, p_stripe_subscription_id text DEFAULT NULL::text, p_raw_payload jsonb DEFAULT NULL::jsonb, p_data_object_id text DEFAULT NULL::text, p_data_object_type text DEFAULT NULL::text, p_processing_error text DEFAULT NULL::text, p_stripe_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.stripe_webhook_events (
    stripe_event_id, event_type, status, org_id,
    stripe_api_version, stripe_customer_id, stripe_subscription_id,
    raw_payload, data_object_id, data_object_type,
    processing_error, stripe_created_at, received_at
  )
  VALUES (
    p_stripe_event_id, p_event_type, p_status, p_org_id,
    p_stripe_api_version, p_stripe_customer_id, p_stripe_subscription_id,
    p_raw_payload, p_data_object_id, p_data_object_type,
    p_processing_error, p_stripe_created_at, now()
  )
  ON CONFLICT (stripe_event_id) DO UPDATE SET
    status = EXCLUDED.status,
    org_id = COALESCE(EXCLUDED.org_id, stripe_webhook_events.org_id),
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, stripe_webhook_events.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, stripe_webhook_events.stripe_subscription_id),
    raw_payload = COALESCE(EXCLUDED.raw_payload, stripe_webhook_events.raw_payload),
    processing_error = EXCLUDED.processing_error,
    processed_at = CASE WHEN EXCLUDED.status IN ('processed', 'failed', 'skipped') THEN now() ELSE stripe_webhook_events.processed_at END,
    retry_count = CASE WHEN EXCLUDED.status = 'failed' THEN stripe_webhook_events.retry_count + 1 ELSE stripe_webhook_events.retry_count END
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


--
-- Name: mark_webhook_processed(text, text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_webhook_processed(p_stripe_event_id text, p_event_type text, p_org_id uuid DEFAULT NULL::uuid, p_result jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  INSERT INTO public.stripe_webhook_events (stripe_event_id, event_type, org_id, result)
  VALUES (p_stripe_event_id, p_event_type, p_org_id, p_result)
  ON CONFLICT (stripe_event_id) DO NOTHING
  RETURNING id;
$$;


--
-- Name: normalize_catalog_name(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_catalog_name(n text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT regexp_replace(trim(n), '\\s+', ' ', 'g');
$$;


--
-- Name: prevent_role_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_role_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- If trying to change role
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Only allow if user is an admin in the organization
        IF NOT EXISTS (
            SELECT 1 FROM investigators AS i
            WHERE i.organization_id = NEW.organization_id
            AND i.profile_id = auth.uid()
            AND i.role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Only admins can change roles';
        END IF;

        -- Prevent changing to admin role unless user is organization owner
        IF NEW.role = 'admin' AND NOT EXISTS (
            SELECT 1 FROM organizations
            WHERE organizations.id = NEW.organization_id
            AND organizations.owner_id = NEW.profile_id
        ) THEN
            RAISE EXCEPTION 'Only organization owners can be admins';
        END IF;

        -- Prevent changing own role
        IF NEW.profile_id = auth.uid() THEN
            RAISE EXCEPTION 'Cannot change your own role';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: preview_tier_change(uuid, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.preview_tier_change(p_org_id uuid, p_new_monthly_credits integer, p_prorate boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old_monthly integer;
  v_old_remaining integer;
  v_used_this_month integer;
  v_new_remaining integer;
  v_extra_seats integer;
  v_credits_per_seat integer;
  v_is_upgrade boolean;
BEGIN
  SELECT
    COALESCE(included_credits_monthly, 0),
    COALESCE(included_credits_remaining, 0)
  INTO v_old_monthly, v_old_remaining
  FROM public.organizations
  WHERE id = p_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'org_not_found');
  END IF;

  v_extra_seats := public.get_extra_seat_count(p_org_id);
  v_credits_per_seat := public.get_credits_per_extra_seat();
  v_is_upgrade := p_new_monthly_credits > v_old_monthly;
  v_used_this_month := GREATEST(0, v_old_monthly - v_old_remaining);

  IF p_prorate THEN
    v_new_remaining := GREATEST(0, p_new_monthly_credits - v_used_this_month);
  ELSE
    v_new_remaining := v_old_remaining;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'preview', true,
    'is_upgrade', v_is_upgrade,
    'is_downgrade', NOT v_is_upgrade AND p_new_monthly_credits < v_old_monthly,
    'old_monthly', v_old_monthly,
    'new_monthly', p_new_monthly_credits,
    'used_this_month', v_used_this_month,
    'current_remaining', v_old_remaining,
    'projected_remaining', v_new_remaining,
    'credit_change', v_new_remaining - v_old_remaining,
    'extra_seats', v_extra_seats,
    'extra_seat_bonus', v_extra_seats * v_credits_per_seat,
    'total_monthly_after', p_new_monthly_credits + (v_extra_seats * v_credits_per_seat),
    'recommendation', CASE
      WHEN v_is_upgrade THEN 'Prorate recommended (give customer new credits minus usage)'
      ELSE 'Defer recommended (let monthly reset handle it)'
    END
  );
END;
$$;


--
-- Name: process_subscription_refund(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_subscription_refund(p_refund_request_id uuid, p_stripe_refund_id text, p_processed_by uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Get and lock refund request
  SELECT * INTO v_request
  FROM public.refund_requests
  WHERE id = p_refund_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Refund request not found');
  END IF;

  IF v_request.status != 'approved' AND v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Refund already processed or denied');
  END IF;

  -- Update refund request
  UPDATE public.refund_requests
  SET 
    status = 'processed',
    stripe_refund_id = p_stripe_refund_id,
    processed_at = now(),
    processed_by = p_processed_by
  WHERE id = p_refund_request_id;

  -- Update organization's refund tracking
  UPDATE public.organizations
  SET 
    last_refund_at = now(),
    refund_count_90d = COALESCE(refund_count_90d, 0) + 1
  WHERE id = v_request.organization_id;

  -- Reset included credits to 0 (they got refunded)
  UPDATE public.organizations
  SET included_credits_remaining = 0
  WHERE id = v_request.organization_id;

  RETURN jsonb_build_object(
    'success', true,
    'refund_request_id', p_refund_request_id,
    'stripe_refund_id', p_stripe_refund_id,
    'refund_amount_cents', v_request.refund_amount_cents
  );
END;
$$;


--
-- Name: process_wallet_refund(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_wallet_refund(p_refund_request_id uuid, p_stripe_refund_id text, p_processed_by uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_request RECORD;
  v_wallet RECORD;
BEGIN
  -- Get and lock refund request
  SELECT * INTO v_request
  FROM public.refund_requests
  WHERE id = p_refund_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Refund request not found');
  END IF;

  IF v_request.status != 'approved' AND v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Refund already processed or denied');
  END IF;

  -- Get and lock wallet
  SELECT * INTO v_wallet
  FROM public.usage_wallets
  WHERE organization_id = v_request.organization_id
  FOR UPDATE;

  -- Update refund request
  UPDATE public.refund_requests
  SET 
    status = 'processed',
    stripe_refund_id = p_stripe_refund_id,
    processed_at = now(),
    processed_by = p_processed_by
  WHERE id = p_refund_request_id;

  -- Zero out wallet balance
  UPDATE public.usage_wallets
  SET 
    balance_cents = 0,
    updated_at = now()
  WHERE organization_id = v_request.organization_id;

  -- Record transaction
  INSERT INTO public.usage_transactions (
    wallet_id,
    transaction_type,
    amount_cents,
    balance_after_cents,
    reference_type,
    reference_id,
    organization_id,
    direction,
    description
  ) VALUES (
    v_wallet.id,
    'refund',
    v_request.refund_amount_cents,
    0,
    'refund_request',
    p_refund_request_id::text,
    v_request.organization_id,
    'debit',
    'Wallet refund processed'
  );

  -- Update organization's refund tracking
  UPDATE public.organizations
  SET last_refund_at = now()
  WHERE id = v_request.organization_id;

  RETURN jsonb_build_object(
    'success', true,
    'refund_request_id', p_refund_request_id,
    'stripe_refund_id', p_stripe_refund_id,
    'refund_amount_cents', v_request.refund_amount_cents
  );
END;
$$;


--
-- Name: regenerate_task_reminders(uuid, integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.regenerate_task_reminders(_task_id uuid, _offsets_minutes integer[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
-- Name: rename_case_category(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rename_case_category(p_org uuid, p_old text, p_new text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_old text := public.normalize_catalog_name(p_old);
  v_new text := public.normalize_catalog_name(p_new);
BEGIN
  -- ensure target exists
  INSERT INTO public.case_category_catalog (organization_id, name)
  VALUES (p_org, v_new)
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- update cases
  UPDATE public.cases
  SET category = v_new
  WHERE organization_id = p_org
    AND category IS NOT NULL
    AND public.normalize_catalog_name(category) = v_old;
END;
$$;


--
-- Name: rename_case_tag(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rename_case_tag(p_org uuid, p_old text, p_new text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_old text := public.normalize_catalog_name(p_old);
  v_new text := public.normalize_catalog_name(p_new);
BEGIN
  -- ensure target exists
  INSERT INTO public.case_tag_catalog (organization_id, name)
  VALUES (p_org, v_new)
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- update tag arrays in cases (normalize each element)
  UPDATE public.cases
  SET tags = (
    SELECT COALESCE(array_agg(CASE WHEN public.normalize_catalog_name(t) = v_old THEN v_new ELSE t END), '{}')
    FROM unnest(tags) AS t
  )
  WHERE organization_id = p_org AND tags IS NOT NULL;
END;
$$;


--
-- Name: reset_chat_messages_for_org(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_chat_messages_for_org(p_org_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_base_monthly integer;
  v_extra_seats integer;
  v_messages_per_seat integer;
  v_total_monthly integer;
BEGIN
  -- Get base monthly from org
  SELECT included_chat_messages_monthly INTO v_base_monthly
  FROM organizations WHERE id = p_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;

  -- Get extra seat count and messages per seat
  v_extra_seats := COALESCE(public.get_extra_seat_count(p_org_id), 0);
  v_messages_per_seat := public.get_chat_messages_per_extra_seat();
  
  -- Calculate total (base + extra seat bonus)
  v_total_monthly := v_base_monthly + (v_extra_seats * v_messages_per_seat);

  -- Reset remaining to total
  UPDATE organizations
  SET chat_messages_remaining = v_total_monthly,
      updated_at = now()
  WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'base_monthly', v_base_monthly,
    'extra_seats', v_extra_seats,
    'extra_seat_messages', v_extra_seats * v_messages_per_seat,
    'total_reset_to', v_total_monthly
  );
END;
$$;


--
-- Name: reset_monthly_included_credits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_monthly_included_credits() RETURNS TABLE(org_id uuid, reset_count integer)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  UPDATE public.organizations
  SET included_credits_remaining = included_credits_monthly
  WHERE included_credits_monthly > 0
  RETURNING id, included_credits_monthly;
$$;


--
-- Name: reset_monthly_included_credits_for_org(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_monthly_included_credits_for_org(p_org_id uuid) RETURNS TABLE(org_id uuid, reset_count integer)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  update public.organizations
  set included_credits_remaining = included_credits_monthly
  where id = p_org_id
    and included_credits_monthly > 0
  returning id, included_credits_monthly;
$$;


--
-- Name: reset_old_refund_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_old_refund_counts() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  UPDATE public.organizations o
  SET refund_count_90d = (
    SELECT COUNT(*)
    FROM public.refund_requests rr
    WHERE rr.organization_id = o.id
      AND rr.status IN ('approved', 'processed')
      AND rr.refund_type = 'subscription'
      AND rr.processed_at > now() - INTERVAL '90 days'
  )
  WHERE o.last_refund_at IS NOT NULL;
$$;


--
-- Name: set_case_reports_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_case_reports_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: spend_chat_message(uuid, uuid, numeric, integer, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.spend_chat_message(p_org_id uuid, p_session_id uuid, p_credit_cost numeric DEFAULT 0.25, p_tokens integer DEFAULT 0, p_llm_cost_usd numeric DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_remaining INTEGER;
    v_monthly_limit INTEGER;
    v_used_free BOOLEAN := false;
    v_spent_credits DECIMAL := 0;
    v_from_included DECIMAL := 0;
    v_from_wallet DECIMAL := 0;
    v_included_remaining DECIMAL;
    v_wallet_balance INTEGER;
BEGIN
    -- Get current chat message state
    SELECT chat_messages_remaining, included_chat_messages_monthly
    INTO v_remaining, v_monthly_limit
    FROM organizations
    WHERE id = p_org_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
    END IF;

    -- Check if we have free messages remaining
    IF v_remaining > 0 THEN
        -- Use a free message
        UPDATE organizations
        SET chat_messages_remaining = chat_messages_remaining - 1,
            updated_at = now()
        WHERE id = p_org_id;
        
        v_used_free := true;
    ELSE
        -- No free messages - need to spend credits
        SELECT included_credits_remaining INTO v_included_remaining
        FROM organizations WHERE id = p_org_id;
        
        IF v_included_remaining >= p_credit_cost THEN
            -- Spend from included credits
            UPDATE organizations
            SET included_credits_remaining = included_credits_remaining - p_credit_cost,
                updated_at = now()
            WHERE id = p_org_id;
            
            v_from_included := p_credit_cost;
            v_spent_credits := p_credit_cost;
        ELSE
            -- Check wallet balance
            SELECT COALESCE(SUM(amount_cents), 0) INTO v_wallet_balance
            FROM wallet_ledger
            WHERE org_id = p_org_id;
            
            IF v_wallet_balance >= (p_credit_cost * 20)::INTEGER THEN
                -- Spend from wallet (convert credits to cents)
                INSERT INTO wallet_ledger (org_id, amount_cents, balance_after_cents, description, reference_type)
                VALUES (
                    p_org_id,
                    -1 * (p_credit_cost * 20)::INTEGER,
                    0,
                    'Chat message (over monthly limit)',
                    'chat_overage'
                );
                
                v_from_wallet := p_credit_cost;
                v_spent_credits := p_credit_cost;
            ELSE
                -- Insufficient credits
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'insufficient_credits',
                    'message', 'No free messages remaining and insufficient credits',
                    'free_remaining', 0,
                    'credits_needed', p_credit_cost,
                    'included_available', COALESCE(v_included_remaining, 0),
                    'wallet_available', COALESCE(v_wallet_balance, 0)
                );
            END IF;
        END IF;
    END IF;

    -- Record in usage_events
    INSERT INTO usage_events (
        org_id,
        category,
        unit,
        qty,
        credit_cost,
        raw_cost_cents,
        from_included_credits,
        from_wallet_credits,
        meta
    ) VALUES (
        p_org_id,
        'chat',
        'message',
        1,
        v_spent_credits,
        (p_llm_cost_usd * 100)::INTEGER,
        v_from_included,
        v_from_wallet,
        jsonb_build_object(
            'session_id', p_session_id,
            'tokens', p_tokens,
            'llm_cost_usd', p_llm_cost_usd,
            'used_free', v_used_free
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'used_free', v_used_free,
        'credits_spent', v_spent_credits,
        'from_included', v_from_included,
        'from_wallet', v_from_wallet,
        'free_remaining', CASE WHEN v_used_free THEN v_remaining - 1 ELSE 0 END,
        'monthly_limit', v_monthly_limit
    );
END;
$$;


--
-- Name: spend_credits(uuid, integer, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.spend_credits(p_org_id uuid, p_credits integer, p_reference_type text DEFAULT NULL::text, p_reference_id text DEFAULT NULL::text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
declare
  v_included integer;
  v_wallet_cents bigint;
  v_wallet_credits integer;
  v_take_included integer;
  v_take_wallet integer;
  v_need_wallet_cents integer;
  v_rate_cents integer := 20; -- $0.20 per credit
begin
  if p_credits is null or p_credits <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_credits');
  end if;

  -- lock org row
  select coalesce(included_credits_remaining, 0)
    into v_included
  from public.organizations
  where id = p_org_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'org_not_found');
  end if;

  -- lock wallet row (may not exist)
  select coalesce(balance_cents, 0)
    into v_wallet_cents
  from public.usage_wallets
  where organization_id = p_org_id
  for update;

  v_wallet_credits := floor(v_wallet_cents / v_rate_cents);

  -- total remaining
  if (v_included + v_wallet_credits) < p_credits then
    return jsonb_build_object(
      'ok', false,
      'reason', 'insufficient_credits',
      'included_remaining', v_included,
      'wallet_remaining', v_wallet_credits,
      'remaining_total', v_included + v_wallet_credits,
      'required_credits', p_credits
    );
  end if;

  -- spend included first
  v_take_included := least(v_included, p_credits);
  v_take_wallet := p_credits - v_take_included;

  if v_take_included > 0 then
    update public.organizations
      set included_credits_remaining = v_included - v_take_included
    where id = p_org_id;
  end if;

  if v_take_wallet > 0 then
    v_need_wallet_cents := v_take_wallet * v_rate_cents;
    update public.usage_wallets
      set balance_cents = balance_cents - v_need_wallet_cents
    where organization_id = p_org_id;

    if not found then
      -- wallet row missing (shouldn't happen if you always create it)
      -- rollback included spend
      update public.organizations
        set included_credits_remaining = v_included
      where id = p_org_id;

      return jsonb_build_object('ok', false, 'reason', 'wallet_missing');
    end if;

    -- Only insert usage_transaction when there's an actual wallet spend (amount_cents > 0)
    insert into public.usage_transactions (
      wallet_id,
      transaction_type,
      amount_cents,
      post_balance_cents,
      reference_type,
      reference_id,
      description,
      organization_id,
      direction
    )
    select
      w.id,
      'spend',
      v_need_wallet_cents,
      w.balance_cents,
      p_reference_type,
      p_reference_id,
      p_description,
      p_org_id,
      'debit'
    from public.usage_wallets w
    where w.organization_id = p_org_id
    on conflict do nothing;
  end if;

  -- return success with fresh balances
  return jsonb_build_object(
    'ok', true,
    'from_included', v_take_included,
    'from_wallet', v_take_wallet,
    'wallet_debit_cents', coalesce(v_need_wallet_cents, 0)
  ) || (select public.get_org_credits(p_org_id));
end;
$_$;


--
-- Name: spend_credits(uuid, integer, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.spend_credits(p_org_id uuid, p_credits integer, p_run_id uuid, p_category text DEFAULT 'investigation'::text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_cents_per_credit INTEGER := 20; -- $0.20 per credit
  
  v_included_remaining INTEGER;
  v_wallet_cents BIGINT;
  v_wallet_credits INTEGER;
  v_total_available INTEGER;
  
  v_use_included INTEGER;
  v_use_wallet INTEGER;
  v_wallet_debit_cents INTEGER;
  
  v_wallet_id UUID;
  v_event_id UUID;
BEGIN
  -- Validation
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_credits',
      'message', 'Credits must be positive'
    );
  END IF;

  IF p_run_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'missing_run_id',
      'message', 'run_id is required for idempotency'
    );
  END IF;

  -- Check if this run_id was already charged (idempotency)
  -- Only check non-duplicate entries
  SELECT id INTO v_event_id
  FROM public.usage_events
  WHERE org_id = p_org_id 
    AND run_id = p_run_id
    AND COALESCE(is_duplicate, FALSE) = FALSE
  LIMIT 1;

  IF v_event_id IS NOT NULL THEN
    -- Already charged, return success without double-charging
    RETURN jsonb_build_object(
      'success', true,
      'already_charged', true,
      'event_id', v_event_id,
      'message', 'This run was already charged'
    ) || public.get_org_credits(p_org_id);
  END IF;

  -- Lock organization row to prevent race conditions
  SELECT COALESCE(included_credits_remaining, 0)
  INTO v_included_remaining
  FROM public.organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'org_not_found',
      'message', 'Organization not found'
    );
  END IF;

  -- Lock or create wallet
  SELECT id, COALESCE(balance_cents, 0)
  INTO v_wallet_id, v_wallet_cents
  FROM public.usage_wallets
  WHERE organization_id = p_org_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.usage_wallets (organization_id, balance_cents)
    VALUES (p_org_id, 0)
    RETURNING id, balance_cents INTO v_wallet_id, v_wallet_cents;
  END IF;

  -- Calculate available credits
  v_wallet_credits := FLOOR(v_wallet_cents / v_cents_per_credit);
  v_total_available := v_included_remaining + v_wallet_credits;

  -- Check if enough credits
  IF v_total_available < p_credits THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'message', 'Not enough credits available',
      'required', p_credits,
      'available', v_total_available,
      'included_remaining', v_included_remaining,
      'wallet_remaining', v_wallet_credits,
      'needs_topup', true
    );
  END IF;

  -- Calculate how many credits to take from each source
  -- Priority: included credits first, then wallet
  v_use_included := LEAST(v_included_remaining, p_credits);
  v_use_wallet := p_credits - v_use_included;
  v_wallet_debit_cents := v_use_wallet * v_cents_per_credit;

  -- Deduct included credits
  IF v_use_included > 0 THEN
    UPDATE public.organizations
    SET included_credits_remaining = included_credits_remaining - v_use_included
    WHERE id = p_org_id;
  END IF;

  -- Deduct wallet credits
  IF v_use_wallet > 0 THEN
    UPDATE public.usage_wallets
    SET 
      balance_cents = balance_cents - v_wallet_debit_cents,
      updated_at = NOW()
    WHERE id = v_wallet_id;
  END IF;

  -- Record the usage event with full tracking
  INSERT INTO public.usage_events (
    org_id,
    run_id,
    category,
    unit,
    qty,
    credit_cost,
    from_included_credits,
    from_wallet_credits,
    wallet_debit_cents,
    occurred_at,
    created_at,
    meta,
    is_duplicate
  ) VALUES (
    p_org_id,
    p_run_id,
    p_category,
    'credits',
    p_credits,
    p_credits,
    v_use_included,
    v_use_wallet,
    v_wallet_debit_cents,
    NOW(),
    NOW(),
    jsonb_build_object('description', COALESCE(p_description, 'Credit spend')),
    FALSE
  )
  RETURNING id INTO v_event_id;

  -- Return success with updated balances
  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'charged_credits', p_credits,
    'from_included', v_use_included,
    'from_wallet', v_use_wallet,
    'wallet_debit_cents', v_wallet_debit_cents
  ) || public.get_org_credits(p_org_id);

END;
$_$;


--
-- Name: spend_credits_for_usage_event(uuid, uuid, uuid, text, text, text, numeric, integer, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.spend_credits_for_usage_event(p_org_id uuid, p_seat_id uuid, p_run_id uuid, p_category text, p_provider text, p_unit text, p_qty numeric, p_credit_cost integer, p_raw_cost_cents integer, p_meta jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_res jsonb;
  v_balance jsonb;
  v_ok boolean;
  v_from_included int;
  v_from_wallet int;
  v_wallet_cents int;
  v_included_remaining int;
begin
  -- Call new spender (credits are in p_credit_cost)
  v_res := public.spend_credits(p_org_id, p_credit_cost, p_run_id, coalesce(p_category, 'usage'), 'legacy_usage_event');

  v_ok := coalesce((v_res->>'success')::boolean, false);
  v_from_included := coalesce((v_res->>'from_included')::int, 0);
  v_from_wallet := coalesce((v_res->>'from_wallet')::int, 0);
  v_balance := public.get_org_credits(p_org_id);
  v_wallet_cents := coalesce((v_balance->>'wallet_balance_cents')::int, 0);
  v_included_remaining := coalesce((v_balance->>'included_remaining')::int, 0);

  if v_ok then
    return jsonb_build_object(
      'ok', true,
      'from_included_credits', v_from_included,
      'from_wallet_credits', v_from_wallet,
      'wallet_debit_cents', coalesce((v_res->>'wallet_debit_cents')::int, 0),
      'included_remaining_credits', v_included_remaining,
      'wallet_balance_cents', v_wallet_cents
    );
  else
    return jsonb_build_object(
      'ok', false,
      'reason', coalesce(v_res->>'error', 'billing_failed'),
      'included_remaining_credits', v_included_remaining,
      'wallet_balance_cents', v_wallet_cents
    );
  end if;
end;
$$;


--
-- Name: touch_usage_overage_catalog_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_usage_overage_catalog_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: update_call_history_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_call_history_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    seat_id uuid,
    case_id uuid,
    person_id uuid,
    business_id uuid,
    title text,
    status text DEFAULT 'active'::text NOT NULL,
    message_count integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    total_cost_usd numeric(10,6) DEFAULT 0 NOT NULL,
    credits_charged numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_message_at timestamp with time zone,
    summary text,
    pinned boolean DEFAULT false NOT NULL,
    file_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT chat_sessions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text, 'deleted'::text])))
);


--
-- Name: update_chat_session(uuid, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_chat_session(p_session_id uuid, p_title text DEFAULT NULL::text, p_pinned boolean DEFAULT NULL::boolean) RETURNS public.chat_sessions
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_session chat_sessions;
BEGIN
    UPDATE chat_sessions
    SET 
        title = COALESCE(p_title, title),
        pinned = COALESCE(p_pinned, pinned),
        updated_at = now()
    WHERE id = p_session_id
    RETURNING * INTO v_session;
    
    RETURN v_session;
END;
$$;


--
-- Name: update_monthly_billing(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_monthly_billing(p_organization_id uuid, p_billing_month date) RETURNS void
    LANGUAGE plpgsql
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
-- Name: update_session_file_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_session_file_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_sessions 
        SET file_count = file_count + 1, updated_at = now()
        WHERE id = NEW.session_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chat_sessions 
        SET file_count = GREATEST(0, file_count - 1), updated_at = now()
        WHERE id = OLD.session_id;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: update_task_and_regenerate_reminders(uuid, timestamp with time zone, integer[], text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_and_regenerate_reminders(_task_id uuid, _new_due timestamp with time zone, _offsets_minutes integer[], _title text DEFAULT NULL::text, _description text DEFAULT NULL::text, _priority text DEFAULT NULL::text, _status text DEFAULT NULL::text, _type text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
-- Name: update_task_and_regenerate_reminders(uuid, timestamp with time zone, text, integer[], text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_task_and_regenerate_reminders(_task_id uuid, _new_due timestamp with time zone, _due_timezone text, _offsets_minutes integer[], _title text DEFAULT NULL::text, _description text DEFAULT NULL::text, _priority text DEFAULT NULL::text, _status text DEFAULT NULL::text, _type text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: usage_wallet_auto_recharge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_wallet_auto_recharge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    amount_cents integer NOT NULL,
    threshold_cents integer NOT NULL,
    payment_method_id text,
    last_run_at timestamp with time zone,
    failed_attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: upsert_usage_wallet_auto_recharge(uuid, boolean, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_usage_wallet_auto_recharge(p_organization_id uuid, p_enabled boolean, p_amount_cents integer, p_threshold_cents integer, p_payment_method_id text DEFAULT NULL::text) RETURNS public.usage_wallet_auto_recharge
    LANGUAGE plpgsql
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
-- Name: use_chat_message(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.use_chat_message(p_org_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    UPDATE organizations 
    SET chat_messages_remaining = GREATEST(0, chat_messages_remaining - 1)
    WHERE id = p_org_id
    RETURNING chat_messages_remaining INTO v_remaining;
    
    -- Return false if they were already at 0 (over limit)
    RETURN v_remaining >= 0;
END;
$$;


--
-- Name: wallet_auto_recharge_result(text, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_auto_recharge_result(p_payment_intent_id text, p_status text, p_amount_cents integer, p_failure_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
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

CREATE TABLE public.usage_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    balance_cents bigint DEFAULT 0 NOT NULL,
    threshold_cents bigint DEFAULT 200 NOT NULL,
    top_up_amount_cents bigint DEFAULT 1000 NOT NULL,
    pending_top_up_cents bigint DEFAULT 0 NOT NULL,
    status text DEFAULT 'payment_required'::text NOT NULL,
    last_top_up_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usage_wallets_balance_cents_check CHECK ((balance_cents >= 0)),
    CONSTRAINT usage_wallets_pending_top_up_cents_check CHECK ((pending_top_up_cents >= 0)),
    CONSTRAINT usage_wallets_status_check CHECK ((status = ANY (ARRAY['active'::text, 'payment_required'::text, 'suspended'::text]))),
    CONSTRAINT usage_wallets_threshold_cents_check CHECK ((threshold_cents >= 0)),
    CONSTRAINT usage_wallets_top_up_amount_cents_check CHECK ((top_up_amount_cents >= 1000))
);


--
-- Name: wallet_clear_pending(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_clear_pending(p_organization_id uuid, p_amount_cents bigint) RETURNS public.usage_wallets
    LANGUAGE plpgsql
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
-- Name: wallet_credit(uuid, bigint, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_credit(p_organization_id uuid, p_amount_cents bigint, p_transaction_type text DEFAULT 'credit_top_up'::text, p_reference_type text DEFAULT NULL::text, p_reference_id text DEFAULT NULL::text, p_description text DEFAULT NULL::text) RETURNS public.usage_wallets
    LANGUAGE plpgsql
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
-- Name: wallet_debit(uuid, bigint, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_debit(p_organization_id uuid, p_amount_cents bigint, p_transaction_type text DEFAULT 'debit_voice'::text, p_reference_type text DEFAULT NULL::text, p_reference_id text DEFAULT NULL::text, p_description text DEFAULT NULL::text) RETURNS public.usage_wallets
    LANGUAGE plpgsql
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
-- Name: wallet_get_or_create(uuid, bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_get_or_create(p_organization_id uuid, p_threshold_cents bigint DEFAULT 200, p_top_up_amount_cents bigint DEFAULT 1000) RETURNS public.usage_wallets
    LANGUAGE plpgsql
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
-- Name: wallet_mark_topup_pending(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_mark_topup_pending(p_organization_id uuid, p_amount_cents bigint) RETURNS public.usage_wallets
    LANGUAGE plpgsql
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
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
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
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

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
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
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
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
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
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
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
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
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
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
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
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
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
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
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

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
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
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
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
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
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

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
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
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
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
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
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

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
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
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
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
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
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

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
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

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
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

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
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
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
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
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
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
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
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

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: action_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    action_type character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    entity_value text,
    results jsonb DEFAULT '{}'::jsonb NOT NULL,
    summary jsonb,
    success boolean DEFAULT true NOT NULL,
    error_message text,
    credits_spent integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: addon_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addon_catalog (
    addon_code text NOT NULL,
    name text NOT NULL,
    unit text,
    price_cents integer NOT NULL,
    stripe_price_id text NOT NULL,
    billing_mode text NOT NULL,
    env text
);


--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    street_1 text,
    street_2 text,
    city text,
    region text,
    postal_code text,
    country text,
    geo jsonb,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    actor_id uuid,
    table_name text NOT NULL,
    row_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    context jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    max_seats integer DEFAULT 3,
    status text DEFAULT '''pending'''::text,
    updated_at timestamp with time zone DEFAULT now(),
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_status text,
    plan_code text,
    plan_price_cents integer,
    included_seats integer,
    included_credits integer,
    current_period_start timestamp with time zone,
    trial_end timestamp with time zone,
    tz text DEFAULT '''America/New_York''::text'::text,
    trial_ending_soon boolean,
    cancel_at_period_end boolean,
    stripe_collection_method text,
    stripe_latest_invoice_id text,
    stripe_latest_invoice_status text,
    stripe_default_payment_method_id text,
    stripe_subscription_status_reason text,
    stripe_pause_collection jsonb,
    stripe_subscription_metadata jsonb,
    payment_action_required boolean,
    payment_retry_count integer,
    next_payment_retry_at timestamp with time zone,
    last_payment_failed_at timestamp with time zone,
    payment_failure_reason text,
    dunning_enabled boolean,
    usage_wallet_status text,
    wallet_threshold_cents bigint,
    wallet_top_up_amount_cents bigint,
    initial_top_up_required boolean,
    included_credits_used integer DEFAULT 0 NOT NULL,
    included_credits_monthly integer DEFAULT 0,
    included_credits_remaining integer DEFAULT 0,
    included_chat_messages_monthly integer DEFAULT 200 NOT NULL,
    chat_messages_remaining integer DEFAULT 500 NOT NULL,
    stripe_subscription_created_at timestamp with time zone,
    stripe_subscription_canceled_at timestamp with time zone,
    stripe_billing_cycle_anchor timestamp with time zone,
    stripe_last_webhook_at timestamp with time zone,
    stripe_webhook_failures integer DEFAULT 0,
    last_refund_at timestamp with time zone,
    refund_count_90d integer DEFAULT 0
);


--
-- Name: stripe_charges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    stripe_charge_id text NOT NULL,
    stripe_customer_id text,
    stripe_invoice_id text,
    stripe_payment_intent_id text,
    amount integer NOT NULL,
    amount_refunded integer DEFAULT 0,
    currency text DEFAULT 'usd'::text,
    status text NOT NULL,
    paid boolean DEFAULT false,
    refunded boolean DEFAULT false,
    card_brand text,
    card_last4 text,
    card_exp_month integer,
    card_exp_year integer,
    receipt_url text,
    receipt_email text,
    description text,
    raw_payload jsonb NOT NULL,
    stripe_created_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stripe_refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    stripe_refund_id text NOT NULL,
    stripe_charge_id text NOT NULL,
    stripe_payment_intent_id text,
    amount integer NOT NULL,
    currency text DEFAULT 'usd'::text,
    status text NOT NULL,
    reason text,
    raw_payload jsonb NOT NULL,
    stripe_created_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: billing_history; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.billing_history AS
 SELECT 'charge'::text AS type,
    c.id,
    c.organization_id,
    o.name AS org_name,
    c.amount,
    c.currency,
    c.status,
    c.card_brand,
    c.card_last4,
    c.receipt_url,
    c.description,
    c.stripe_created_at AS event_date
   FROM (public.stripe_charges c
     LEFT JOIN public.organizations o ON ((o.id = c.organization_id)))
  WHERE (c.status = 'succeeded'::text)
UNION ALL
 SELECT 'refund'::text AS type,
    r.id,
    r.organization_id,
    o.name AS org_name,
    (- r.amount) AS amount,
    r.currency,
    r.status,
    NULL::text AS card_brand,
    NULL::text AS card_last4,
    NULL::text AS receipt_url,
    r.reason AS description,
    r.stripe_created_at AS event_date
   FROM (public.stripe_refunds r
     LEFT JOIN public.organizations o ON ((o.id = r.organization_id)))
  WHERE (r.status = 'succeeded'::text)
  ORDER BY 12 DESC;


--
-- Name: billing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    default_markup_percentage numeric(5,2) DEFAULT 20.00 NOT NULL,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    auto_billing boolean DEFAULT true NOT NULL,
    billing_email character varying(255),
    payment_method character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    ein_tax_id text,
    officers jsonb DEFAULT '[]'::jsonb NOT NULL,
    addresses jsonb DEFAULT '[]'::jsonb NOT NULL,
    registration jsonb DEFAULT '{}'::jsonb NOT NULL,
    domains jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar text,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text
);


--
-- Name: COLUMN businesses.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.businesses.notes IS 'Enriched data from Hunter.io and other sources (industry, technologies, socials, etc.)';


--
-- Name: call_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    twilio_call_sid character varying(255) NOT NULL,
    call_direction character varying(10) NOT NULL,
    from_number character varying(20) NOT NULL,
    to_number character varying(20) NOT NULL,
    agent_id uuid,
    organization_id uuid,
    lead_id uuid,
    call_status character varying(20) DEFAULT 'initiated'::character varying NOT NULL,
    call_duration integer DEFAULT 0,
    call_start_time timestamp with time zone,
    call_end_time timestamp with time zone,
    call_quality_score numeric(3,2),
    recording_url text,
    recording_duration integer,
    twilio_price numeric(10,4),
    twilio_price_unit character varying(3) DEFAULT 'USD'::character varying,
    call_notes text,
    call_tags text[],
    call_outcome character varying(20),
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    follow_up_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_billed_seconds integer DEFAULT 0,
    last_usage_check_at timestamp with time zone,
    forced_disconnect_reason text,
    CONSTRAINT call_history_call_direction_check CHECK (((call_direction)::text = ANY (ARRAY[('inbound'::character varying)::text, ('outbound'::character varying)::text]))),
    CONSTRAINT call_history_call_outcome_check CHECK (((call_outcome)::text = ANY (ARRAY[('successful'::character varying)::text, ('no-answer'::character varying)::text, ('busy'::character varying)::text, ('failed'::character varying)::text, ('voicemail'::character varying)::text, ('callback-requested'::character varying)::text, ('not-interested'::character varying)::text]))),
    CONSTRAINT call_history_call_status_check CHECK (((call_status)::text = ANY (ARRAY[('initiated'::character varying)::text, ('ringing'::character varying)::text, ('answered'::character varying)::text, ('completed'::character varying)::text, ('busy'::character varying)::text, ('no-answer'::character varying)::text, ('failed'::character varying)::text, ('canceled'::character varying)::text])))
);


--
-- Name: TABLE call_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.call_history IS 'Stores complete call history with Twilio integration';


--
-- Name: COLUMN call_history.twilio_call_sid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_history.twilio_call_sid IS 'Unique Twilio Call SID for webhook integration';


--
-- Name: COLUMN call_history.call_direction; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_history.call_direction IS 'inbound or outbound call direction';


--
-- Name: COLUMN call_history.call_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_history.call_status IS 'Current status of the call from Twilio';


--
-- Name: COLUMN call_history.call_duration; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_history.call_duration IS 'Call duration in seconds, calculated automatically';


--
-- Name: COLUMN call_history.call_quality_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_history.call_quality_score IS 'Call quality rating from 0.00 to 5.00';


--
-- Name: COLUMN call_history.call_outcome; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_history.call_outcome IS 'Business outcome of the call';


--
-- Name: COLUMN call_history.follow_up_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.call_history.follow_up_required IS 'Whether a follow-up call is needed';


--
-- Name: call_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.call_statistics AS
 SELECT organization_id,
    agent_id,
    date(call_start_time) AS call_date,
    call_direction,
    call_status,
    call_outcome,
    count(*) AS total_calls,
    avg(call_duration) AS avg_duration,
    sum(call_duration) AS total_duration,
    count(
        CASE
            WHEN ((call_status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_calls,
    count(
        CASE
            WHEN ((call_outcome)::text = 'successful'::text) THEN 1
            ELSE NULL::integer
        END) AS successful_calls
   FROM public.call_history
  WHERE (call_start_time IS NOT NULL)
  GROUP BY organization_id, agent_id, (date(call_start_time)), call_direction, call_status, call_outcome;


--
-- Name: case_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid,
    investigator_id uuid,
    assigned_at timestamp with time zone DEFAULT now(),
    role text DEFAULT 'assigned'::text
);


--
-- Name: case_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: case_category_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_category_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT case_category_catalog_name_chars CHECK ((name ~ '^[A-Za-z0-9][A-Za-z0-9 _-]*$'::text)),
    CONSTRAINT case_category_catalog_name_len CHECK (((char_length(name) >= 1) AND (char_length(name) <= 64)))
);


--
-- Name: case_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    subject_id uuid,
    organization_id uuid NOT NULL,
    uploader_id uuid,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size bigint NOT NULL,
    storage_path text NOT NULL,
    checksum text,
    description text,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT case_evidence_file_name_check CHECK ((char_length(file_name) <= 255)),
    CONSTRAINT case_evidence_file_size_check CHECK ((file_size >= 0))
);


--
-- Name: case_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    author_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    data_source_tags text[] DEFAULT '{}'::text[]
);


--
-- Name: case_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    case_id uuid,
    title text NOT NULL,
    description text,
    blocks jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: case_tag_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_tag_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT case_tag_catalog_name_chars CHECK ((name ~ '^[A-Za-z0-9][A-Za-z0-9 _-]*$'::text)),
    CONSTRAINT case_tag_catalog_name_len CHECK (((char_length(name) >= 1) AND (char_length(name) <= 32)))
);


--
-- Name: cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    created_by uuid,
    title text,
    summary text,
    category character varying(100),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    priority character varying(50) DEFAULT 'low'::character varying NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    subject jsonb,
    assigned_to uuid[] DEFAULT '{}'::uuid[],
    graph_id uuid,
    archived_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subject_id uuid,
    subject_type text,
    portal_password_hash text,
    portal_password_salt text,
    portal_password_issued_at timestamp with time zone,
    portal_password_used_at timestamp with time zone,
    CONSTRAINT cases_priority_check CHECK (((priority)::text = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT cases_status_check CHECK (((status)::text = ANY (ARRAY['active'::text, 'in_progress'::text, 'closed'::text])))
);


--
-- Name: chat_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    message_id uuid,
    organization_id uuid NOT NULL,
    uploaded_by uuid,
    filename text NOT NULL,
    original_filename text NOT NULL,
    mime_type text NOT NULL,
    file_size integer NOT NULL,
    storage_bucket text DEFAULT 'chat-files'::text NOT NULL,
    storage_path text NOT NULL,
    status text DEFAULT 'uploaded'::text NOT NULL,
    extracted_text text,
    extraction_error text,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_files_status_check CHECK ((status = ANY (ARRAY['uploading'::text, 'uploaded'::text, 'processing'::text, 'processed'::text, 'error'::text])))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    tool_calls jsonb,
    tool_call_id text,
    input_tokens integer,
    output_tokens integer,
    cost_usd numeric(10,6),
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text])))
);


--
-- Name: usage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    seat_id uuid,
    category text NOT NULL,
    unit text NOT NULL,
    qty numeric NOT NULL,
    provider text,
    raw_cost_cents integer,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    run_id uuid,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    credit_cost integer DEFAULT 0 NOT NULL,
    raw_cost_cent integer DEFAULT 0 NOT NULL,
    from_included_credits integer DEFAULT 0,
    from_wallet_credits integer DEFAULT 0,
    wallet_debit_cents integer DEFAULT 0,
    is_duplicate boolean DEFAULT false
);


--
-- Name: chat_usage_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.chat_usage_summary AS
 SELECT o.id AS org_id,
    o.name AS org_name,
    o.included_chat_messages_monthly AS monthly_limit,
    o.chat_messages_remaining AS free_remaining,
    (o.included_chat_messages_monthly - o.chat_messages_remaining) AS free_used,
    COALESCE(cu.overage_messages, (0)::bigint) AS overage_messages,
    COALESCE(cu.overage_credits, (0)::bigint) AS overage_credits_spent,
    COALESCE(cu.total_tokens, (0)::bigint) AS total_tokens,
    COALESCE(cu.total_llm_cost_usd, (0)::numeric) AS total_llm_cost_usd
   FROM (public.organizations o
     LEFT JOIN ( SELECT usage_events.org_id,
            count(*) FILTER (WHERE (((usage_events.meta ->> 'used_free'::text))::boolean = false)) AS overage_messages,
            sum(usage_events.credit_cost) FILTER (WHERE (((usage_events.meta ->> 'used_free'::text))::boolean = false)) AS overage_credits,
            sum(((usage_events.meta ->> 'tokens'::text))::integer) AS total_tokens,
            sum(((usage_events.meta ->> 'llm_cost_usd'::text))::numeric) AS total_llm_cost_usd
           FROM public.usage_events
          WHERE ((usage_events.category = 'chat'::text) AND (usage_events.occurred_at >= date_trunc('month'::text, now())))
          GROUP BY usage_events.org_id) cu ON ((cu.org_id = o.id)));


--
-- Name: court_record_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.court_record_searches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid,
    organization_id uuid NOT NULL,
    query text NOT NULL,
    total_results integer DEFAULT 0,
    cases_count integer DEFAULT 0,
    opinions_count integer DEFAULT 0,
    court_breakdown jsonb DEFAULT '{}'::jsonb,
    case_types jsonb DEFAULT '{}'::jsonb,
    date_range jsonb DEFAULT '{"latest": null, "earliest": null}'::jsonb,
    has_active_cases boolean DEFAULT false,
    has_criminal_cases boolean DEFAULT false,
    has_bankruptcy boolean DEFAULT false,
    cases jsonb DEFAULT '[]'::jsonb,
    opinions jsonb DEFAULT '[]'::jsonb,
    credits_spent integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT now(),
    entity_id uuid,
    entity_type text
);


--
-- Name: dehashed_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dehashed_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    entity_type text NOT NULL,
    organization_id uuid NOT NULL,
    query text NOT NULL,
    search_type text NOT NULL,
    total_entries integer DEFAULT 0,
    unique_emails jsonb DEFAULT '[]'::jsonb,
    unique_usernames jsonb DEFAULT '[]'::jsonb,
    unique_passwords_count integer DEFAULT 0,
    unique_ip_addresses jsonb DEFAULT '[]'::jsonb,
    unique_names jsonb DEFAULT '[]'::jsonb,
    unique_phones jsonb DEFAULT '[]'::jsonb,
    databases_found jsonb DEFAULT '[]'::jsonb,
    has_ashley_madison boolean DEFAULT false,
    has_passwords boolean DEFAULT false,
    sensitive_breaches jsonb DEFAULT '[]'::jsonb,
    entries jsonb DEFAULT '[]'::jsonb,
    credits_spent integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_contents (
    document_id uuid NOT NULL,
    text_content text NOT NULL,
    content_sha256 text NOT NULL,
    extracted_at timestamp with time zone DEFAULT now() NOT NULL,
    extract_error text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: document_entity_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_entity_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    entity_type text NOT NULL,
    value_raw text NOT NULL,
    value_normalized text NOT NULL,
    confidence numeric(3,2) DEFAULT 0.70 NOT NULL,
    context_snippet text,
    source text DEFAULT 'document_text'::text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    kind text,
    text text,
    metadata jsonb DEFAULT '{}'::jsonb,
    entities_mentioned jsonb DEFAULT '[]'::jsonb,
    source_url text,
    retrieved_at timestamp with time zone DEFAULT now(),
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    doc jsonb DEFAULT jsonb_build_object('type', 'other') NOT NULL,
    canonical_url text,
    url_hash text,
    title text,
    snippet text,
    source_type text,
    raw_html_ref text,
    raw_pdf_ref text,
    text_content text,
    content_hash text,
    http_status integer,
    mime_type text,
    lang text,
    fetched_at timestamp with time zone,
    fetch_error text,
    raw_storage_path text,
    meta jsonb DEFAULT '{}'::jsonb
);


--
-- Name: domain_ips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_ips (
    domain_id uuid NOT NULL,
    ip_id uuid NOT NULL
);


--
-- Name: domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    whois jsonb DEFAULT '{}'::jsonb,
    creation_date timestamp with time zone,
    expiry_date timestamp with time zone,
    dns_records jsonb DEFAULT '[]'::jsonb,
    subdomains jsonb DEFAULT '[]'::jsonb,
    hosting_provider text,
    techstack jsonb DEFAULT '[]'::jsonb,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_date timestamp with time zone,
    nameservers text[],
    mail_provider text
);


--
-- Name: COLUMN domains.whois; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domains.whois IS 'WHOIS registration data: registrant, registrar, status, dnssec, privacy_protected';


--
-- Name: COLUMN domains.dns_records; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domains.dns_records IS 'DNS records: A, AAAA, MX, TXT, NS, CNAME, SPF, DMARC';


--
-- Name: COLUMN domains.subdomains; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domains.subdomains IS 'Known subdomains';


--
-- Name: COLUMN domains.hosting_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domains.hosting_provider IS 'Detected hosting provider';


--
-- Name: COLUMN domains.techstack; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domains.techstack IS 'Detected technology stack';


--
-- Name: COLUMN domains.updated_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domains.updated_date IS 'Last updated date from WHOIS';


--
-- Name: COLUMN domains.nameservers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domains.nameservers IS 'Domain nameservers from WHOIS or DNS NS records';


--
-- Name: COLUMN domains.mail_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.domains.mail_provider IS 'Detected mail provider (Google Workspace, Microsoft 365, etc.)';


--
-- Name: duplicate_usage_events; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.duplicate_usage_events AS
 SELECT id,
    org_id,
    seat_id,
    category,
    unit,
    qty,
    provider,
    raw_cost_cents,
    occurred_at,
    created_at,
    run_id,
    meta,
    credit_cost,
    raw_cost_cent,
    from_included_credits,
    from_wallet_credits,
    wallet_debit_cents,
    is_duplicate,
    'DUPLICATE - Review for potential refund'::text AS note
   FROM public.usage_events ue
  WHERE (is_duplicate = true)
  ORDER BY created_at DESC;


--
-- Name: email_breach_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_breach_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    breach_count integer DEFAULT 0 NOT NULL,
    paste_count integer DEFAULT 0 NOT NULL,
    breaches jsonb DEFAULT '[]'::jsonb NOT NULL,
    pastes jsonb DEFAULT '[]'::jsonb NOT NULL,
    exposed_data_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_pwn_count bigint DEFAULT 0 NOT NULL,
    sensitive_breaches jsonb DEFAULT '[]'::jsonb NOT NULL,
    most_recent_breach date,
    credits_spent integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_paste_leaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_paste_leaks (
    email_id uuid NOT NULL,
    paste_id uuid NOT NULL
);


--
-- Name: email_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_profiles (
    email_id uuid NOT NULL,
    profile_id uuid NOT NULL
);


--
-- Name: email_site_scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_site_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    total_sites_checked integer DEFAULT 0 NOT NULL,
    results jsonb DEFAULT '[]'::jsonb NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    scan_duration_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    address text NOT NULL,
    domain text,
    first_seen timestamp with time zone,
    breach_hits jsonb DEFAULT '[]'::jsonb NOT NULL,
    paste_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    profiles jsonb DEFAULT '[]'::jsonb NOT NULL,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    confidence real,
    last_checked timestamp with time zone
);


--
-- Name: entity_document_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_document_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    document_id uuid NOT NULL,
    mention_type text,
    query_used text,
    rank integer,
    confidence real,
    matched_terms jsonb,
    source text,
    retrieved_at timestamp with time zone DEFAULT now() NOT NULL,
    provenance jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT entity_document_mentions_confidence_check CHECK (((confidence >= (0)::double precision) AND (confidence <= (1)::double precision))),
    CONSTRAINT entity_document_mentions_entity_type_check CHECK ((entity_type = ANY (ARRAY['person'::text, 'business'::text, 'domain'::text, 'username'::text, 'email'::text]))),
    CONSTRAINT entity_document_mentions_mention_type_check CHECK ((mention_type = ANY (ARRAY['web_mention'::text, 'profile'::text, 'resume'::text, 'news'::text, 'directory'::text])))
);


--
-- Name: entity_edges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_edges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    transform_type text,
    source_api text,
    source_url text,
    raw_reference_id text,
    confidence_score real,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    retrieved_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: entity_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    run_id uuid,
    document_id uuid,
    mention_id uuid,
    context_snippet text,
    source_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    url text NOT NULL,
    hash jsonb,
    exif jsonb,
    faces_detected jsonb DEFAULT '[]'::jsonb NOT NULL,
    reverse_matches jsonb DEFAULT '[]'::jsonb NOT NULL,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    description text,
    source text,
    CONSTRAINT images_source_check CHECK ((source = ANY (ARRAY['upload'::text, 'url'::text])))
);


--
-- Name: investigators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investigators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    role public.investigator_role DEFAULT 'viewer'::public.investigator_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    profile_id uuid
);


--
-- Name: invoice_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    stripe_invoice_id text,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    items jsonb,
    subtotal_cents integer,
    tax_cents integer,
    total_cents integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    stripe_invoice_id text NOT NULL,
    subscription_id uuid,
    amount integer NOT NULL,
    currency text NOT NULL,
    status text NOT NULL,
    invoice_pdf_url text,
    hosted_invoice_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: ip_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    address text,
    asn text,
    organization text,
    geo jsonb,
    open_ports jsonb DEFAULT '[]'::jsonb,
    services jsonb DEFAULT '[]'::jsonb,
    reputation jsonb DEFAULT '[]'::jsonb,
    first_seen timestamp with time zone,
    last_seen timestamp with time zone,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ip jsonb,
    title text,
    description text,
    isp text,
    hostname text,
    hostnames text[],
    is_proxy boolean DEFAULT false,
    is_hosting boolean DEFAULT false,
    is_mobile boolean DEFAULT false,
    is_tor boolean DEFAULT false,
    threat_level text
);


--
-- Name: COLUMN ip_addresses.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_addresses.address IS 'IP address string for easy querying';


--
-- Name: COLUMN ip_addresses.isp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_addresses.isp IS 'Internet Service Provider name';


--
-- Name: COLUMN ip_addresses.hostname; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_addresses.hostname IS 'Primary reverse DNS hostname';


--
-- Name: COLUMN ip_addresses.hostnames; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_addresses.hostnames IS 'All reverse DNS hostnames';


--
-- Name: COLUMN ip_addresses.is_proxy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_addresses.is_proxy IS 'Whether IP is a known proxy/VPN';


--
-- Name: COLUMN ip_addresses.is_hosting; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_addresses.is_hosting IS 'Whether IP belongs to a hosting provider';


--
-- Name: COLUMN ip_addresses.is_mobile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_addresses.is_mobile IS 'Whether IP is a mobile carrier IP';


--
-- Name: COLUMN ip_addresses.is_tor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_addresses.is_tor IS 'Whether IP is a Tor exit node';


--
-- Name: COLUMN ip_addresses.threat_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_addresses.threat_level IS 'Overall threat assessment (low, medium, high)';


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    company character varying(255),
    stage character varying(50) DEFAULT 'new'::character varying NOT NULL,
    value numeric(15,2) DEFAULT 0,
    title character varying(500),
    description text,
    category character varying(100),
    status character varying(50) DEFAULT 'active'::character varying,
    priority character varying(50) DEFAULT 'low'::character varying,
    tags text[] DEFAULT '{}'::text[],
    last_contact date,
    notes text,
    organization_id uuid,
    assigned_to uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT leads_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('critical'::character varying)::text]))),
    CONSTRAINT leads_stage_check CHECK (((stage)::text = ANY (ARRAY[('new'::character varying)::text, ('contacted'::character varying)::text, ('qualified'::character varying)::text, ('proposal'::character varying)::text, ('closed-won'::character varying)::text, ('closed-lost'::character varying)::text]))),
    CONSTRAINT leads_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('in_progress'::character varying)::text, ('closed'::character varying)::text])))
);


--
-- Name: leaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    source text NOT NULL,
    content_snippet text,
    found_emails jsonb DEFAULT '[]'::jsonb NOT NULL,
    found_usernames jsonb DEFAULT '[]'::jsonb NOT NULL,
    found_password_hashes jsonb DEFAULT '[]'::jsonb NOT NULL,
    retrieved_at timestamp with time zone,
    url text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    fingerprint text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mention_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mention_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    run_id uuid NOT NULL,
    entity_type text NOT NULL,
    value_normalized text NOT NULL,
    decision text NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    note text,
    CONSTRAINT mention_decisions_decision_check CHECK ((decision = ANY (ARRAY['ignored'::text, 'promoted'::text])))
);


--
-- Name: monthly_billing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_billing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    billing_month date NOT NULL,
    voice_minutes numeric(8,2) DEFAULT 0.00 NOT NULL,
    voice_cost numeric(10,2) DEFAULT 0.00 NOT NULL,
    total_cost numeric(10,2) DEFAULT 0.00 NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    invoice_number character varying(100),
    due_date date,
    paid_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    title text,
    message text,
    type text DEFAULT 'general'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    action_url text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    reminder_id uuid,
    shown boolean
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;


--
-- Name: org_credit_balance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.org_credit_balance AS
 SELECT o.id AS org_id,
    COALESCE(o.included_credits_monthly, 0) AS included_monthly,
    COALESCE(o.included_credits_remaining, 0) AS included_remaining,
    COALESCE(w.balance_cents, (0)::bigint) AS wallet_balance_cents,
    floor(((COALESCE(w.balance_cents, (0)::bigint))::numeric / 20.0)) AS wallet_remaining,
    ((COALESCE(o.included_credits_remaining, 0))::numeric + floor(((COALESCE(w.balance_cents, (0)::bigint))::numeric / 20.0))) AS remaining_total
   FROM (public.organizations o
     LEFT JOIN public.usage_wallets w ON ((w.organization_id = o.id)));


--
-- Name: org_suspensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_suspensions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    kind text NOT NULL,
    reason text,
    requested_by uuid,
    effective_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: organization_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    role text,
    organization_id uuid,
    invited_by uuid,
    status text DEFAULT 'pending'::text
);


--
-- Name: paste_leaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paste_leaks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    source text NOT NULL,
    content_snippet text,
    found_emails jsonb DEFAULT '[]'::jsonb NOT NULL,
    found_usernames jsonb DEFAULT '[]'::jsonb NOT NULL,
    found_password_hashes jsonb DEFAULT '[]'::jsonb NOT NULL,
    retrieved_at timestamp with time zone,
    url text,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_failure_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_failure_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    stripe_invoice_id text,
    error_message text,
    retry_count integer,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_payload jsonb
);


--
-- Name: payment_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_intents (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    stripe_payment_intent_id text NOT NULL,
    organization_id uuid,
    amount integer NOT NULL,
    currency text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.people (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    avatar text,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    aliases text[] DEFAULT '{}'::text[] NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    date_of_birth text,
    confidence numeric,
    first_seen timestamp with time zone,
    last_seen timestamp with time zone,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    name jsonb DEFAULT jsonb_build_object('first', '', 'last', '', 'middle', NULL::unknown, 'given', NULL::unknown, 'family', NULL::unknown, 'prefix', NULL::unknown, 'suffix', NULL::unknown) NOT NULL,
    gender text,
    notes text,
    CONSTRAINT people_confidence_range CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))))
);


--
-- Name: phones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    number_e164 text NOT NULL,
    country text,
    carrier text,
    line_type text,
    messaging_apps text[] DEFAULT '{}'::text[],
    spam_reports integer,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    os text,
    last_used timestamp with time zone,
    number_raw text
);


--
-- Name: COLUMN phones.number_raw; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.phones.number_raw IS 'Original phone number format before E.164 normalization';


--
-- Name: plan_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_catalog (
    plan_code text NOT NULL,
    name text NOT NULL,
    base_price_cents integer NOT NULL,
    included_seats integer NOT NULL,
    included_credits integer NOT NULL,
    stripe_price_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    active boolean DEFAULT true,
    env text DEFAULT 'test'::text,
    description text,
    included_chat_messages integer DEFAULT 500 NOT NULL,
    CONSTRAINT plan_catalog_env_check CHECK ((env = ANY (ARRAY['test'::text, 'live'::text])))
);


--
-- Name: profile_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_images (
    profile_id uuid NOT NULL,
    image_id uuid NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text,
    last_name text,
    completed_onboarding boolean,
    avatar text,
    title text,
    bio text,
    phone text,
    location text
);


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    address_full text,
    address_components jsonb DEFAULT '{}'::jsonb NOT NULL,
    geo jsonb DEFAULT '{}'::jsonb NOT NULL,
    parcel jsonb DEFAULT '{}'::jsonb NOT NULL,
    legal_description text,
    characteristics jsonb DEFAULT '{}'::jsonb NOT NULL,
    valuation jsonb DEFAULT '{}'::jsonb NOT NULL,
    occupancy jsonb DEFAULT '{}'::jsonb NOT NULL,
    mail_address jsonb DEFAULT '{}'::jsonb NOT NULL,
    owners_current jsonb DEFAULT '[]'::jsonb NOT NULL,
    owners_prior jsonb DEFAULT '[]'::jsonb NOT NULL,
    sale_history jsonb DEFAULT '[]'::jsonb NOT NULL,
    mortgages jsonb DEFAULT '[]'::jsonb NOT NULL,
    liens_judgments jsonb DEFAULT '[]'::jsonb NOT NULL,
    utilities_signals jsonb DEFAULT '[]'::jsonb NOT NULL,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    confidence numeric,
    first_seen timestamp with time zone,
    last_seen timestamp with time zone,
    provenance jsonb DEFAULT '[]'::jsonb NOT NULL,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: public_presence_run_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.public_presence_run_items (
    run_id uuid NOT NULL,
    document_id uuid NOT NULL,
    query_used text,
    purpose text,
    rank integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: public_presence_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.public_presence_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    status text NOT NULL,
    template_version text DEFAULT 'v1'::text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT public_presence_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'done'::text, 'failed'::text])))
);


--
-- Name: refund_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    refund_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    stripe_charge_id text,
    stripe_invoice_id text,
    stripe_refund_id text,
    stripe_subscription_id text,
    original_amount_cents integer NOT NULL,
    refund_amount_cents integer NOT NULL,
    credits_at_request integer,
    credits_refunded integer DEFAULT 0,
    auto_eligible boolean DEFAULT false,
    eligibility_check jsonb,
    denial_reason text,
    reason text,
    notes text,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT refund_requests_refund_type_check CHECK ((refund_type = ANY (ARRAY['subscription'::text, 'wallet'::text, 'action_credit'::text]))),
    CONSTRAINT refund_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text, 'processed'::text, 'failed'::text])))
);


--
-- Name: run_ai_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.run_ai_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    run_id uuid NOT NULL,
    model text NOT NULL,
    max_items integer NOT NULL,
    suggestions_hash text NOT NULL,
    prompt_tokens integer,
    completion_tokens integer,
    total_tokens integer,
    cost_cents integer,
    results jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: run_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.run_entities (
    run_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: seat_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seat_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    seat_id uuid,
    action text NOT NULL,
    reason text,
    delta integer NOT NULL,
    stripe_item_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    user_id uuid,
    phone_sid text,
    phone_e164 text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: social_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    handle text NOT NULL,
    platform text NOT NULL,
    profile_url text,
    display_name text,
    bio text,
    posts jsonb DEFAULT '[]'::jsonb NOT NULL,
    followers_count integer,
    following_count integer,
    join_date timestamp with time zone,
    location text,
    web_mentions jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stripe_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    stripe_customer_id text NOT NULL,
    email text,
    name text,
    phone text,
    address jsonb,
    balance integer DEFAULT 0,
    currency text DEFAULT 'usd'::text,
    raw_payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stripe_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    stripe_invoice_id text NOT NULL,
    stripe_customer_id text,
    status text,
    hosted_invoice_url text,
    invoice_pdf text,
    currency text,
    amount_due integer,
    amount_paid integer,
    amount_remaining integer,
    total integer,
    subtotal integer,
    tax integer,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    finalized_at timestamp with time zone,
    paid_at timestamp with time zone,
    raw_payload jsonb NOT NULL
);


--
-- Name: stripe_payment_failures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_payment_failures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    stripe_invoice_id text,
    stripe_charge_id text,
    stripe_payment_intent_id text,
    failure_code text,
    failure_message text,
    decline_code text,
    next_action text,
    attempt_count integer DEFAULT 1,
    stripe_created_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: stripe_payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    stripe_payment_method_id text NOT NULL,
    stripe_customer_id text NOT NULL,
    type text NOT NULL,
    card_brand text,
    card_last4 text,
    card_exp_month integer,
    card_exp_year integer,
    is_default boolean DEFAULT false,
    raw_payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stripe_subscription_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_subscription_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    event_type text NOT NULL,
    description text NOT NULL,
    amount_cents integer,
    balance_impact text,
    metadata jsonb,
    stripe_event_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: stripe_subscription_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_subscription_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    stripe_subscription_id text NOT NULL,
    stripe_customer_id text,
    event_type text NOT NULL,
    status text,
    collection_method text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    trial_end timestamp with time zone,
    cancel_at timestamp with time zone,
    cancel_at_period_end boolean,
    default_payment_method_id text,
    raw_payload jsonb NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stripe_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stripe_event_id text NOT NULL,
    event_type text NOT NULL,
    processed_at timestamp with time zone DEFAULT now(),
    org_id uuid,
    result jsonb,
    created_at timestamp with time zone DEFAULT now(),
    organization_id uuid,
    stripe_api_version text,
    stripe_customer_id text,
    stripe_subscription_id text,
    raw_payload jsonb,
    data_object_id text,
    data_object_type text,
    status text DEFAULT 'received'::text,
    processing_error text,
    retry_count integer DEFAULT 0,
    stripe_created_at timestamp with time zone,
    received_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stripe_webhook_events_status_check CHECK ((status = ANY (ARRAY['received'::text, 'processing'::text, 'processed'::text, 'failed'::text, 'skipped'::text])))
);


--
-- Name: subjects_legacy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects_legacy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    name text NOT NULL,
    email text,
    avatar text,
    location jsonb DEFAULT '{}'::jsonb NOT NULL,
    devices jsonb[] DEFAULT '{}'::jsonb[] NOT NULL,
    social_profiles jsonb[] DEFAULT '{}'::jsonb[] NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    aliases text[] DEFAULT '{}'::text[],
    CONSTRAINT entities_type_check CHECK (((type)::text = ANY ((ARRAY['person'::character varying, 'company'::character varying])::text[])))
);


--
-- Name: subscription_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    stripe_subscription_id text,
    event text NOT NULL,
    from_plan text,
    to_plan text,
    proration_cents integer DEFAULT 0,
    raw jsonb,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.subscription_timeline AS
 SELECT sw.id,
    sw.event_type,
    sw.status AS webhook_status,
    sw.org_id,
    o.name AS org_name,
    sw.stripe_subscription_id,
    sw.stripe_customer_id,
    sw.received_at,
    sw.processed_at,
    sw.processing_error,
    ss.status AS subscription_status,
    ss.current_period_start,
    ss.current_period_end,
    ss.cancel_at_period_end
   FROM ((public.stripe_webhook_events sw
     LEFT JOIN public.organizations o ON ((o.id = sw.org_id)))
     LEFT JOIN LATERAL ( SELECT stripe_subscription_snapshots.status,
            stripe_subscription_snapshots.current_period_start,
            stripe_subscription_snapshots.current_period_end,
            stripe_subscription_snapshots.cancel_at_period_end
           FROM public.stripe_subscription_snapshots
          WHERE ((stripe_subscription_snapshots.stripe_subscription_id = sw.stripe_subscription_id) AND (stripe_subscription_snapshots.org_id = sw.org_id))
          ORDER BY stripe_subscription_snapshots.received_at DESC
         LIMIT 1) ss ON (true))
  WHERE ((sw.event_type ~~ 'customer.subscription.%'::text) OR (sw.event_type ~~ 'invoice.%'::text))
  ORDER BY sw.received_at DESC;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid,
    stripe_subscription_id text,
    stripe_customer_id text,
    status text NOT NULL,
    plan_type text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: task_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_reminders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    task_id uuid NOT NULL,
    reminder_time timestamp with time zone NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    notification_type character varying(50) DEFAULT 'browser'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_reminders_notification_type_check CHECK (((notification_type)::text = ANY (ARRAY[('browser'::character varying)::text, ('email'::character varying)::text, ('both'::character varying)::text]))),
    CONSTRAINT task_reminders_status_check CHECK ((TRIM(BOTH FROM lower((status)::text)) = ANY (ARRAY['pending'::text, 'delivered'::text, 'canceled'::text])))
);


--
-- Name: TABLE task_reminders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.task_reminders IS 'Reminders for tasks with notification scheduling';


--
-- Name: COLUMN task_reminders.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_reminders.status IS 'Reminder status: pending, sent, cancelled';


--
-- Name: COLUMN task_reminders.notification_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.task_reminders.notification_type IS 'Notification type: browser, email, both';


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    priority character varying(50) DEFAULT 'medium'::character varying NOT NULL,
    type character varying(100) DEFAULT 'general'::character varying NOT NULL,
    due_date timestamp with time zone NOT NULL,
    reminder_enabled boolean DEFAULT false,
    lead_id uuid,
    lead_name character varying(255),
    organization_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reminder_time timestamp with time zone,
    due_timezone text DEFAULT 'UTC'::text NOT NULL,
    CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY (ARRAY[('urgent'::character varying)::text, ('high'::character varying)::text, ('medium'::character varying)::text, ('low'::character varying)::text]))),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text]))),
    CONSTRAINT tasks_type_check CHECK (((type)::text = ANY (ARRAY[('follow_up'::character varying)::text, ('call'::character varying)::text, ('email'::character varying)::text, ('meeting'::character varying)::text, ('proposal'::character varying)::text, ('general'::character varying)::text])))
);


--
-- Name: TABLE tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tasks IS 'Main tasks table for task management system';


--
-- Name: COLUMN tasks.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.status IS 'Task status: pending, in_progress, completed';


--
-- Name: COLUMN tasks.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.priority IS 'Task priority: urgent, high, medium, low';


--
-- Name: COLUMN tasks.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tasks.type IS 'Task type: follow_up, call, email, meeting, proposal, general';


--
-- Name: task_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.task_stats AS
 SELECT organization_id,
    owner_id,
    count(*) AS total_tasks,
    count(
        CASE
            WHEN ((status)::text = 'pending'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_tasks,
    count(
        CASE
            WHEN ((status)::text = 'in_progress'::text) THEN 1
            ELSE NULL::integer
        END) AS in_progress_tasks,
    count(
        CASE
            WHEN ((status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_tasks,
    count(
        CASE
            WHEN ((due_date < now()) AND ((status)::text <> 'completed'::text)) THEN 1
            ELSE NULL::integer
        END) AS overdue_tasks,
    count(
        CASE
            WHEN ((date(due_date) = date(now())) AND ((status)::text <> 'completed'::text)) THEN 1
            ELSE NULL::integer
        END) AS due_today_tasks,
    count(
        CASE
            WHEN ((due_date >= now()) AND (due_date <= (now() + '7 days'::interval)) AND ((status)::text <> 'completed'::text)) THEN 1
            ELSE NULL::integer
        END) AS due_this_week_tasks,
    count(
        CASE
            WHEN ((priority)::text = 'urgent'::text) THEN 1
            ELSE NULL::integer
        END) AS urgent_tasks,
    count(
        CASE
            WHEN ((priority)::text = 'high'::text) THEN 1
            ELSE NULL::integer
        END) AS high_priority_tasks,
    count(
        CASE
            WHEN (reminder_enabled = true) THEN 1
            ELSE NULL::integer
        END) AS tasks_with_reminders
   FROM public.tasks t
  GROUP BY organization_id, owner_id;


--
-- Name: VIEW task_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.task_stats IS 'Aggregated task statistics for organizations and users';


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])))
);


--
-- Name: usage_overage_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_overage_catalog (
    overage_code text NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    stripe_price_id text NOT NULL,
    aggregation text DEFAULT 'sum'::text NOT NULL,
    rounding_mode text DEFAULT 'ceil'::text NOT NULL,
    billing_increment_seconds integer DEFAULT 60 NOT NULL,
    unit_precision integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    env text DEFAULT 'test'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    price_cents integer,
    unit text,
    CONSTRAINT usage_overage_catalog_aggregation_check CHECK ((aggregation = ANY (ARRAY['sum'::text, 'max'::text, 'last_during_period'::text, 'last_ever'::text]))),
    CONSTRAINT usage_overage_catalog_env_check CHECK ((env = ANY (ARRAY['test'::text, 'live'::text]))),
    CONSTRAINT usage_overage_catalog_provider_check CHECK ((provider = ANY (ARRAY['twilio'::text, 'vapi'::text, 'internal'::text]))),
    CONSTRAINT usage_overage_catalog_rounding_mode_check CHECK ((rounding_mode = ANY (ARRAY['none'::text, 'ceil'::text, 'floor'::text, 'round'::text])))
);


--
-- Name: usage_period_rollups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_period_rollups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    minutes_total numeric DEFAULT 0 NOT NULL,
    sms_total numeric DEFAULT 0 NOT NULL,
    emails_total numeric DEFAULT 0 NOT NULL,
    minutes_overage numeric DEFAULT 0 NOT NULL,
    sms_overage numeric DEFAULT 0 NOT NULL,
    emails_overage numeric DEFAULT 0 NOT NULL,
    stripe_usage_push_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: usage_topups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_topups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    stripe_payment_intent_id text,
    stripe_invoice_id text,
    amount_cents bigint NOT NULL,
    status text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    failure_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usage_topups_amount_cents_check CHECK ((amount_cents > 0)),
    CONSTRAINT usage_topups_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT usage_topups_status_check CHECK ((status = ANY (ARRAY['initiated'::text, 'requires_action'::text, 'succeeded'::text, 'failed'::text, 'canceled'::text])))
);


--
-- Name: usage_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    transaction_type text NOT NULL,
    amount_cents bigint NOT NULL,
    post_balance_cents bigint NOT NULL,
    reference_type text,
    reference_id text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    direction text,
    CONSTRAINT usage_transactions_amount_cents_check CHECK ((amount_cents <> 0)),
    CONSTRAINT usage_transactions_direction_check CHECK ((direction = ANY (ARRAY['credit'::text, 'debit'::text]))),
    CONSTRAINT usage_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['credit_top_up'::text, 'credit_adjustment'::text, 'debit_voice'::text, 'debit_sms'::text, 'debit_email'::text, 'debit_other'::text, 'credit_refund'::text, 'spend'::text])))
);


--
-- Name: usage_wallet_auto_recharge_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_wallet_auto_recharge_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auto_recharge_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    status text NOT NULL,
    requested_amount_cents integer NOT NULL,
    balance_before_cents integer,
    balance_after_cents integer,
    stripe_payment_intent_id text,
    failure_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usage_wallet_auto_recharge_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'disabled'::text])))
);


--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    browser_notifications boolean DEFAULT true,
    email_notifications boolean DEFAULT true,
    push_notifications boolean DEFAULT true,
    reminder_advance_minutes integer DEFAULT 15,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid,
    role character varying(50) DEFAULT 'member'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: usernames; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usernames (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    value text NOT NULL,
    platforms jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    web_mentions jsonb
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: messages_2026_01_26; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_26 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_27; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_27 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_28; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_28 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_29; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_29 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_30; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_30 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_31; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_31 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_02_01; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_02_01 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);


--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


--
-- Name: messages_2026_01_26; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_26 FOR VALUES FROM ('2026-01-26 00:00:00') TO ('2026-01-27 00:00:00');


--
-- Name: messages_2026_01_27; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_27 FOR VALUES FROM ('2026-01-27 00:00:00') TO ('2026-01-28 00:00:00');


--
-- Name: messages_2026_01_28; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_28 FOR VALUES FROM ('2026-01-28 00:00:00') TO ('2026-01-29 00:00:00');


--
-- Name: messages_2026_01_29; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_29 FOR VALUES FROM ('2026-01-29 00:00:00') TO ('2026-01-30 00:00:00');


--
-- Name: messages_2026_01_30; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_30 FOR VALUES FROM ('2026-01-30 00:00:00') TO ('2026-01-31 00:00:00');


--
-- Name: messages_2026_01_31; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_31 FOR VALUES FROM ('2026-01-31 00:00:00') TO ('2026-02-01 00:00:00');


--
-- Name: messages_2026_02_01; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_01 FOR VALUES FROM ('2026-02-01 00:00:00') TO ('2026-02-02 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: action_results action_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_results
    ADD CONSTRAINT action_results_pkey PRIMARY KEY (id);


--
-- Name: addon_catalog addon_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_catalog
    ADD CONSTRAINT addon_catalog_pkey PRIMARY KEY (addon_code);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: billing_settings billing_settings_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_settings
    ADD CONSTRAINT billing_settings_organization_id_key UNIQUE (organization_id);


--
-- Name: billing_settings billing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_settings
    ADD CONSTRAINT billing_settings_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: call_history call_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_history
    ADD CONSTRAINT call_history_pkey PRIMARY KEY (id);


--
-- Name: call_history call_history_twilio_call_sid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_history
    ADD CONSTRAINT call_history_twilio_call_sid_key UNIQUE (twilio_call_sid);


--
-- Name: case_assignments case_assignments_case_id_investigator_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_assignments
    ADD CONSTRAINT case_assignments_case_id_investigator_id_key UNIQUE (case_id, investigator_id);


--
-- Name: case_assignments case_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_assignments
    ADD CONSTRAINT case_assignments_pkey PRIMARY KEY (id);


--
-- Name: case_audit_log case_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_audit_log
    ADD CONSTRAINT case_audit_log_pkey PRIMARY KEY (id);


--
-- Name: case_category_catalog case_category_catalog_org_name_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_category_catalog
    ADD CONSTRAINT case_category_catalog_org_name_uniq UNIQUE (organization_id, name);


--
-- Name: case_category_catalog case_category_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_category_catalog
    ADD CONSTRAINT case_category_catalog_pkey PRIMARY KEY (id);


--
-- Name: case_evidence case_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_evidence
    ADD CONSTRAINT case_evidence_pkey PRIMARY KEY (id);


--
-- Name: case_notes case_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_notes
    ADD CONSTRAINT case_notes_pkey PRIMARY KEY (id);


--
-- Name: case_reports case_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_reports
    ADD CONSTRAINT case_reports_pkey PRIMARY KEY (id);


--
-- Name: case_tag_catalog case_tag_catalog_org_name_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_tag_catalog
    ADD CONSTRAINT case_tag_catalog_org_name_uniq UNIQUE (organization_id, name);


--
-- Name: case_tag_catalog case_tag_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_tag_catalog
    ADD CONSTRAINT case_tag_catalog_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: chat_files chat_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_files
    ADD CONSTRAINT chat_files_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: chat_usage_monthly chat_usage_monthly_organization_id_month_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_usage_monthly
    ADD CONSTRAINT chat_usage_monthly_organization_id_month_key_key UNIQUE (organization_id, month_key);


--
-- Name: chat_usage_monthly chat_usage_monthly_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_usage_monthly
    ADD CONSTRAINT chat_usage_monthly_pkey PRIMARY KEY (id);


--
-- Name: court_record_searches court_record_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_record_searches
    ADD CONSTRAINT court_record_searches_pkey PRIMARY KEY (id);


--
-- Name: dehashed_scans dehashed_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dehashed_scans
    ADD CONSTRAINT dehashed_scans_pkey PRIMARY KEY (id);


--
-- Name: document_contents document_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_contents
    ADD CONSTRAINT document_contents_pkey PRIMARY KEY (document_id);


--
-- Name: document_entity_mentions document_entity_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_entity_mentions
    ADD CONSTRAINT document_entity_mentions_pkey PRIMARY KEY (id);


--
-- Name: document_entity_mentions document_entity_mentions_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_entity_mentions
    ADD CONSTRAINT document_entity_mentions_unique UNIQUE (document_id, entity_type, value_normalized);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents documents_url_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_url_hash_unique UNIQUE (url_hash);


--
-- Name: domain_ips domain_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_ips
    ADD CONSTRAINT domain_ips_pkey PRIMARY KEY (domain_id, ip_id);


--
-- Name: domains domains_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: domains domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_pkey PRIMARY KEY (id);


--
-- Name: email_breach_scans email_breach_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_breach_scans
    ADD CONSTRAINT email_breach_scans_pkey PRIMARY KEY (id);


--
-- Name: email_paste_leaks email_paste_leaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_paste_leaks
    ADD CONSTRAINT email_paste_leaks_pkey PRIMARY KEY (email_id, paste_id);


--
-- Name: email_profiles email_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_profiles
    ADD CONSTRAINT email_profiles_pkey PRIMARY KEY (email_id, profile_id);


--
-- Name: email_site_scans email_site_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_site_scans
    ADD CONSTRAINT email_site_scans_pkey PRIMARY KEY (id);


--
-- Name: emails emails_organization_id_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_organization_id_address_key UNIQUE (organization_id, address);


--
-- Name: emails emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: subjects_legacy entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects_legacy
    ADD CONSTRAINT entities_pkey PRIMARY KEY (id);


--
-- Name: entity_document_mentions entity_document_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_document_mentions
    ADD CONSTRAINT entity_document_mentions_pkey PRIMARY KEY (id);


--
-- Name: entity_document_mentions entity_document_mentions_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_document_mentions
    ADD CONSTRAINT entity_document_mentions_unique UNIQUE (entity_type, entity_id, document_id);


--
-- Name: entity_edges entity_edges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_edges
    ADD CONSTRAINT entity_edges_pkey PRIMARY KEY (id);


--
-- Name: entity_edges entity_edges_source_type_source_id_target_type_target_id_tr_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_edges
    ADD CONSTRAINT entity_edges_source_type_source_id_target_type_target_id_tr_key UNIQUE (source_type, source_id, target_type, target_id, transform_type);


--
-- Name: entity_evidence entity_evidence_entity_type_entity_id_mention_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_evidence
    ADD CONSTRAINT entity_evidence_entity_type_entity_id_mention_id_key UNIQUE (entity_type, entity_id, mention_id);


--
-- Name: entity_evidence entity_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_evidence
    ADD CONSTRAINT entity_evidence_pkey PRIMARY KEY (id);


--
-- Name: images images_organization_id_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_organization_id_url_key UNIQUE (organization_id, url);


--
-- Name: images images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);


--
-- Name: investigators investigators_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigators
    ADD CONSTRAINT investigators_id_organization_id_key UNIQUE (id, organization_id);


--
-- Name: investigators investigators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigators
    ADD CONSTRAINT investigators_pkey PRIMARY KEY (id);


--
-- Name: invoice_snapshots invoice_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_snapshots
    ADD CONSTRAINT invoice_snapshots_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: ip_addresses ip_addresses_organization_id_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_addresses
    ADD CONSTRAINT ip_addresses_organization_id_address_key UNIQUE (organization_id, address);


--
-- Name: ip_addresses ip_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_addresses
    ADD CONSTRAINT ip_addresses_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: leaks leaks_organization_id_fingerprint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaks
    ADD CONSTRAINT leaks_organization_id_fingerprint_key UNIQUE (organization_id, fingerprint);


--
-- Name: leaks leaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaks
    ADD CONSTRAINT leaks_pkey PRIMARY KEY (id);


--
-- Name: mention_decisions mention_decisions_organization_id_run_id_entity_type_value__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mention_decisions
    ADD CONSTRAINT mention_decisions_organization_id_run_id_entity_type_value__key UNIQUE (organization_id, run_id, entity_type, value_normalized);


--
-- Name: mention_decisions mention_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mention_decisions
    ADD CONSTRAINT mention_decisions_pkey PRIMARY KEY (id);


--
-- Name: monthly_billing monthly_billing_organization_id_billing_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_billing
    ADD CONSTRAINT monthly_billing_organization_id_billing_month_key UNIQUE (organization_id, billing_month);


--
-- Name: monthly_billing monthly_billing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_billing
    ADD CONSTRAINT monthly_billing_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: org_suspensions org_suspensions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_suspensions
    ADD CONSTRAINT org_suspensions_pkey PRIMARY KEY (id);


--
-- Name: organization_invites organization_invites_email_organization_id_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_email_organization_id_status_key UNIQUE (email, organization_id, status);


--
-- Name: organization_invites organization_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: paste_leaks paste_leaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paste_leaks
    ADD CONSTRAINT paste_leaks_pkey PRIMARY KEY (id);


--
-- Name: payment_failure_events payment_failure_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_failure_events
    ADD CONSTRAINT payment_failure_events_pkey PRIMARY KEY (id);


--
-- Name: payment_intents payment_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);


--
-- Name: people people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (id);


--
-- Name: phones phones_organization_id_number_e164_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phones
    ADD CONSTRAINT phones_organization_id_number_e164_key UNIQUE (organization_id, number_e164);


--
-- Name: phones phones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phones
    ADD CONSTRAINT phones_pkey PRIMARY KEY (id);


--
-- Name: plan_catalog plan_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_catalog
    ADD CONSTRAINT plan_catalog_pkey PRIMARY KEY (plan_code);


--
-- Name: plan_catalog plan_catalog_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_catalog
    ADD CONSTRAINT plan_catalog_unique UNIQUE (plan_code, env, active);


--
-- Name: profile_images profile_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_images
    ADD CONSTRAINT profile_images_pkey PRIMARY KEY (profile_id, image_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: public_presence_run_items public_presence_run_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_presence_run_items
    ADD CONSTRAINT public_presence_run_items_pkey PRIMARY KEY (run_id, document_id);


--
-- Name: public_presence_runs public_presence_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_presence_runs
    ADD CONSTRAINT public_presence_runs_pkey PRIMARY KEY (id);


--
-- Name: refund_requests refund_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_pkey PRIMARY KEY (id);


--
-- Name: run_ai_suggestions run_ai_suggestions_organization_id_run_id_model_max_items_s_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_ai_suggestions
    ADD CONSTRAINT run_ai_suggestions_organization_id_run_id_model_max_items_s_key UNIQUE (organization_id, run_id, model, max_items, suggestions_hash);


--
-- Name: run_ai_suggestions run_ai_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_ai_suggestions
    ADD CONSTRAINT run_ai_suggestions_pkey PRIMARY KEY (id);


--
-- Name: run_entities run_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_entities
    ADD CONSTRAINT run_entities_pkey PRIMARY KEY (run_id, entity_type, entity_id);


--
-- Name: seat_events seat_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_events
    ADD CONSTRAINT seat_events_pkey PRIMARY KEY (id);


--
-- Name: seats seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_pkey PRIMARY KEY (id);


--
-- Name: social_profiles social_profiles_organization_id_platform_handle_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT social_profiles_organization_id_platform_handle_key UNIQUE (organization_id, platform, handle);


--
-- Name: social_profiles social_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT social_profiles_pkey PRIMARY KEY (id);


--
-- Name: stripe_charges stripe_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_charges
    ADD CONSTRAINT stripe_charges_pkey PRIMARY KEY (id);


--
-- Name: stripe_charges stripe_charges_stripe_charge_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_charges
    ADD CONSTRAINT stripe_charges_stripe_charge_id_key UNIQUE (stripe_charge_id);


--
-- Name: stripe_customers stripe_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_customers
    ADD CONSTRAINT stripe_customers_pkey PRIMARY KEY (id);


--
-- Name: stripe_customers stripe_customers_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_customers
    ADD CONSTRAINT stripe_customers_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- Name: stripe_invoices stripe_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_invoices
    ADD CONSTRAINT stripe_invoices_pkey PRIMARY KEY (id);


--
-- Name: stripe_invoices stripe_invoices_stripe_invoice_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_invoices
    ADD CONSTRAINT stripe_invoices_stripe_invoice_id_key UNIQUE (stripe_invoice_id);


--
-- Name: stripe_payment_failures stripe_payment_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_payment_failures
    ADD CONSTRAINT stripe_payment_failures_pkey PRIMARY KEY (id);


--
-- Name: stripe_payment_methods stripe_payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_payment_methods
    ADD CONSTRAINT stripe_payment_methods_pkey PRIMARY KEY (id);


--
-- Name: stripe_payment_methods stripe_payment_methods_stripe_payment_method_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_payment_methods
    ADD CONSTRAINT stripe_payment_methods_stripe_payment_method_id_key UNIQUE (stripe_payment_method_id);


--
-- Name: stripe_refunds stripe_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_refunds
    ADD CONSTRAINT stripe_refunds_pkey PRIMARY KEY (id);


--
-- Name: stripe_refunds stripe_refunds_stripe_refund_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_refunds
    ADD CONSTRAINT stripe_refunds_stripe_refund_id_key UNIQUE (stripe_refund_id);


--
-- Name: stripe_subscription_ledger stripe_subscription_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_subscription_ledger
    ADD CONSTRAINT stripe_subscription_ledger_pkey PRIMARY KEY (id);


--
-- Name: stripe_subscription_snapshots stripe_subscription_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_subscription_snapshots
    ADD CONSTRAINT stripe_subscription_snapshots_pkey PRIMARY KEY (id);


--
-- Name: stripe_webhook_events stripe_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: stripe_webhook_events stripe_webhook_events_stripe_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_stripe_event_id_key UNIQUE (stripe_event_id);


--
-- Name: subscription_ledger subscription_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_ledger
    ADD CONSTRAINT subscription_ledger_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: task_reminders task_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reminders
    ADD CONSTRAINT task_reminders_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_organization_id_key UNIQUE (user_id, organization_id);


--
-- Name: usage_events usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_pkey PRIMARY KEY (id);


--
-- Name: usage_overage_catalog usage_overage_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_overage_catalog
    ADD CONSTRAINT usage_overage_catalog_pkey PRIMARY KEY (overage_code);


--
-- Name: usage_overage_catalog usage_overage_catalog_stripe_price_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_overage_catalog
    ADD CONSTRAINT usage_overage_catalog_stripe_price_id_key UNIQUE (stripe_price_id);


--
-- Name: usage_period_rollups usage_period_rollups_org_id_period_start_period_end_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_period_rollups
    ADD CONSTRAINT usage_period_rollups_org_id_period_start_period_end_key UNIQUE (org_id, period_start, period_end);


--
-- Name: usage_period_rollups usage_period_rollups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_period_rollups
    ADD CONSTRAINT usage_period_rollups_pkey PRIMARY KEY (id);


--
-- Name: usage_topups usage_topups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_topups
    ADD CONSTRAINT usage_topups_pkey PRIMARY KEY (id);


--
-- Name: usage_topups usage_topups_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_topups
    ADD CONSTRAINT usage_topups_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- Name: usage_transactions usage_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_transactions
    ADD CONSTRAINT usage_transactions_pkey PRIMARY KEY (id);


--
-- Name: usage_wallet_auto_recharge_events usage_wallet_auto_recharge_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_wallet_auto_recharge_events
    ADD CONSTRAINT usage_wallet_auto_recharge_events_pkey PRIMARY KEY (id);


--
-- Name: usage_wallet_auto_recharge usage_wallet_auto_recharge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_wallet_auto_recharge
    ADD CONSTRAINT usage_wallet_auto_recharge_pkey PRIMARY KEY (id);


--
-- Name: usage_wallets usage_wallets_org_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_wallets
    ADD CONSTRAINT usage_wallets_org_unique UNIQUE (organization_id);


--
-- Name: usage_wallets usage_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_wallets
    ADD CONSTRAINT usage_wallets_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_organization_id_key UNIQUE (user_id, organization_id);


--
-- Name: user_organizations user_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_pkey PRIMARY KEY (id);


--
-- Name: user_organizations user_organizations_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_user_id_organization_id_key UNIQUE (user_id, organization_id);


--
-- Name: usernames usernames_organization_id_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usernames
    ADD CONSTRAINT usernames_organization_id_value_key UNIQUE (organization_id, value);


--
-- Name: usernames usernames_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usernames
    ADD CONSTRAINT usernames_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_26 messages_2026_01_26_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_26
    ADD CONSTRAINT messages_2026_01_26_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_27 messages_2026_01_27_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_27
    ADD CONSTRAINT messages_2026_01_27_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_28 messages_2026_01_28_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_28
    ADD CONSTRAINT messages_2026_01_28_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_29 messages_2026_01_29_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_29
    ADD CONSTRAINT messages_2026_01_29_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_30 messages_2026_01_30_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_30
    ADD CONSTRAINT messages_2026_01_30_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_31 messages_2026_01_31_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_31
    ADD CONSTRAINT messages_2026_01_31_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_02_01 messages_2026_02_01_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_02_01
    ADD CONSTRAINT messages_2026_02_01_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: case_category_catalog_org_lowername_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX case_category_catalog_org_lowername_uniq ON public.case_category_catalog USING btree (organization_id, lower(name));


--
-- Name: case_tag_catalog_org_lowername_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX case_tag_catalog_org_lowername_uniq ON public.case_tag_catalog USING btree (organization_id, lower(name));


--
-- Name: court_record_searches_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX court_record_searches_entity_idx ON public.court_record_searches USING btree (entity_id, entity_type);


--
-- Name: court_record_searches_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX court_record_searches_org_idx ON public.court_record_searches USING btree (organization_id);


--
-- Name: court_record_searches_person_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX court_record_searches_person_idx ON public.court_record_searches USING btree (person_id);


--
-- Name: dehashed_scans_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dehashed_scans_created_idx ON public.dehashed_scans USING btree (created_at DESC);


--
-- Name: dehashed_scans_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dehashed_scans_entity_idx ON public.dehashed_scans USING btree (entity_id, entity_type);


--
-- Name: dehashed_scans_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dehashed_scans_org_idx ON public.dehashed_scans USING btree (organization_id);


--
-- Name: documents_unfetched_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_unfetched_idx ON public.documents USING btree (fetched_at) WHERE (fetched_at IS NULL);


--
-- Name: entity_evidence_entity_type_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entity_evidence_entity_type_entity_id_idx ON public.entity_evidence USING btree (entity_type, entity_id);


--
-- Name: entity_evidence_run_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entity_evidence_run_id_idx ON public.entity_evidence USING btree (run_id);


--
-- Name: idx_action_results_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_results_action_type ON public.action_results USING btree (action_type);


--
-- Name: idx_action_results_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_results_created_at ON public.action_results USING btree (created_at DESC);


--
-- Name: idx_action_results_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_results_entity ON public.action_results USING btree (entity_type, entity_id);


--
-- Name: idx_action_results_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_results_org_id ON public.action_results USING btree (organization_id);


--
-- Name: idx_addresses_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_org ON public.addresses USING btree (organization_id);


--
-- Name: idx_addresses_web_mentions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addresses_web_mentions_gin ON public.addresses USING gin (web_mentions);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_table ON public.audit_log USING btree (table_name);


--
-- Name: idx_businesses_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_name ON public.businesses USING btree (name);


--
-- Name: idx_businesses_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_org ON public.businesses USING btree (organization_id);


--
-- Name: idx_call_history_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_agent_id ON public.call_history USING btree (agent_id);


--
-- Name: idx_call_history_call_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_call_direction ON public.call_history USING btree (call_direction);


--
-- Name: idx_call_history_call_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_call_start_time ON public.call_history USING btree (call_start_time);


--
-- Name: idx_call_history_call_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_call_status ON public.call_history USING btree (call_status);


--
-- Name: idx_call_history_from_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_from_number ON public.call_history USING btree (from_number);


--
-- Name: idx_call_history_in_progress; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_in_progress ON public.call_history USING btree (call_status) WHERE ((call_status)::text = ANY (ARRAY[('answered'::character varying)::text, ('in-progress'::character varying)::text, ('in_progress'::character varying)::text]));


--
-- Name: idx_call_history_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_lead_id ON public.call_history USING btree (lead_id);


--
-- Name: idx_call_history_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_organization_id ON public.call_history USING btree (organization_id);


--
-- Name: idx_call_history_to_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_to_number ON public.call_history USING btree (to_number);


--
-- Name: idx_call_history_twilio_sid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_history_twilio_sid ON public.call_history USING btree (twilio_call_sid);


--
-- Name: idx_case_audit_log_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_audit_log_case_id ON public.case_audit_log USING btree (case_id);


--
-- Name: idx_case_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_audit_log_created_at ON public.case_audit_log USING btree (created_at DESC);


--
-- Name: idx_case_category_catalog_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_category_catalog_name ON public.case_category_catalog USING btree (name);


--
-- Name: idx_case_category_catalog_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_category_catalog_org ON public.case_category_catalog USING btree (organization_id);


--
-- Name: idx_case_evidence_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_evidence_case_id ON public.case_evidence USING btree (case_id);


--
-- Name: idx_case_evidence_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_evidence_created_at ON public.case_evidence USING btree (created_at DESC);


--
-- Name: idx_case_evidence_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_evidence_org_id ON public.case_evidence USING btree (organization_id);


--
-- Name: idx_case_notes_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_notes_case_id ON public.case_notes USING btree (case_id);


--
-- Name: idx_case_notes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_notes_created_at ON public.case_notes USING btree (created_at DESC);


--
-- Name: idx_case_reports_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_reports_case ON public.case_reports USING btree (case_id);


--
-- Name: idx_case_reports_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_reports_org ON public.case_reports USING btree (organization_id);


--
-- Name: idx_case_tag_catalog_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_tag_catalog_name ON public.case_tag_catalog USING btree (name);


--
-- Name: idx_case_tag_catalog_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_tag_catalog_org ON public.case_tag_catalog USING btree (organization_id);


--
-- Name: idx_cases_archived_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_archived_at ON public.cases USING btree (archived_at);


--
-- Name: idx_cases_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_created_at ON public.cases USING btree (created_at DESC);


--
-- Name: idx_cases_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_entity_id ON public.cases USING btree (subject_id);


--
-- Name: idx_cases_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_org ON public.cases USING btree (organization_id);


--
-- Name: idx_cases_portal_password_used_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_portal_password_used_at ON public.cases USING btree (portal_password_used_at);


--
-- Name: idx_cases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_status ON public.cases USING btree (status);


--
-- Name: idx_cases_subject_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_subject_type_id ON public.cases USING btree (subject_type, subject_id);


--
-- Name: idx_chat_files_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_files_message ON public.chat_files USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: idx_chat_files_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_files_org ON public.chat_files USING btree (organization_id);


--
-- Name: idx_chat_files_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_files_session ON public.chat_files USING btree (session_id);


--
-- Name: idx_chat_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_created ON public.chat_messages USING btree (session_id, created_at);


--
-- Name: idx_chat_messages_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_session ON public.chat_messages USING btree (session_id);


--
-- Name: idx_chat_sessions_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_case ON public.chat_sessions USING btree (case_id) WHERE (case_id IS NOT NULL);


--
-- Name: idx_chat_sessions_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_org ON public.chat_sessions USING btree (organization_id);


--
-- Name: idx_chat_sessions_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_person ON public.chat_sessions USING btree (person_id) WHERE (person_id IS NOT NULL);


--
-- Name: idx_chat_sessions_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_updated ON public.chat_sessions USING btree (updated_at DESC);


--
-- Name: idx_chat_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_user ON public.chat_sessions USING btree (user_id);


--
-- Name: idx_chat_usage_org_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_usage_org_month ON public.chat_usage_monthly USING btree (organization_id, month_key);


--
-- Name: idx_document_contents_extracted_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_contents_extracted_at_desc ON public.document_contents USING btree (extracted_at DESC);


--
-- Name: idx_document_entity_mentions_created_at_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_entity_mentions_created_at_desc ON public.document_entity_mentions USING btree (created_at DESC);


--
-- Name: idx_document_entity_mentions_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_entity_mentions_document_id ON public.document_entity_mentions USING btree (document_id);


--
-- Name: idx_document_entity_mentions_entity_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_entity_mentions_entity_value ON public.document_entity_mentions USING btree (entity_type, value_normalized);


--
-- Name: idx_documents_canonical_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_canonical_url ON public.documents USING btree (canonical_url);


--
-- Name: idx_documents_fetched_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_fetched_at ON public.documents USING btree (fetched_at);


--
-- Name: idx_documents_http_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_http_status ON public.documents USING btree (http_status);


--
-- Name: idx_documents_meta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_meta ON public.documents USING gin (meta);


--
-- Name: idx_documents_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_org ON public.documents USING btree (organization_id);


--
-- Name: idx_documents_web_mentions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_web_mentions_gin ON public.documents USING gin (web_mentions);


--
-- Name: idx_domains_creation_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_creation_date ON public.domains USING btree (creation_date);


--
-- Name: idx_domains_expiry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_expiry_date ON public.domains USING btree (expiry_date);


--
-- Name: idx_domains_mail_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_mail_provider ON public.domains USING btree (mail_provider);


--
-- Name: idx_domains_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_name ON public.domains USING btree (name);


--
-- Name: idx_domains_nameservers; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_nameservers ON public.domains USING gin (nameservers);


--
-- Name: idx_domains_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_org ON public.domains USING btree (organization_id);


--
-- Name: idx_domains_web_mentions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domains_web_mentions_gin ON public.domains USING gin (web_mentions);


--
-- Name: idx_email_breach_scans_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_breach_scans_email_id ON public.email_breach_scans USING btree (email_id);


--
-- Name: idx_email_breach_scans_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_breach_scans_org_id ON public.email_breach_scans USING btree (organization_id);


--
-- Name: idx_email_site_scans_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_site_scans_email_id ON public.email_site_scans USING btree (email_id);


--
-- Name: idx_email_site_scans_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_site_scans_org_id ON public.email_site_scans USING btree (organization_id);


--
-- Name: idx_emails_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emails_address ON public.emails USING btree (address);


--
-- Name: idx_emails_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emails_org ON public.emails USING btree (organization_id);


--
-- Name: idx_emails_web_mentions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emails_web_mentions_gin ON public.emails USING gin (web_mentions);


--
-- Name: idx_entities_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entities_name ON public.subjects_legacy USING gin (to_tsvector('simple'::regconfig, COALESCE(name, ''::text)));


--
-- Name: idx_entities_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entities_org ON public.subjects_legacy USING btree (organization_id);


--
-- Name: idx_entity_document_mentions_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_document_mentions_document ON public.entity_document_mentions USING btree (document_id);


--
-- Name: idx_entity_document_mentions_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_document_mentions_entity ON public.entity_document_mentions USING btree (entity_type, entity_id);


--
-- Name: idx_entity_edges_meta_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_edges_meta_gin ON public.entity_edges USING gin (meta);


--
-- Name: idx_entity_edges_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_edges_source ON public.entity_edges USING btree (source_type, source_id);


--
-- Name: idx_entity_edges_src; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_edges_src ON public.entity_edges USING btree (source_type, source_id);


--
-- Name: idx_entity_edges_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_edges_target ON public.entity_edges USING btree (target_type, target_id);


--
-- Name: idx_entity_edges_tgt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_edges_tgt ON public.entity_edges USING btree (target_type, target_id);


--
-- Name: idx_images_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_images_org ON public.images USING btree (organization_id);


--
-- Name: idx_images_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_images_url ON public.images USING btree (url);


--
-- Name: idx_images_web_mentions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_images_web_mentions_gin ON public.images USING gin (web_mentions);


--
-- Name: idx_invoices_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_subscription_id ON public.invoices USING btree (subscription_id);


--
-- Name: idx_ip_addresses_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_addresses_address ON public.ip_addresses USING btree (address);


--
-- Name: idx_ip_addresses_hostname; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_addresses_hostname ON public.ip_addresses USING btree (hostname);


--
-- Name: idx_ip_addresses_is_hosting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_addresses_is_hosting ON public.ip_addresses USING btree (is_hosting) WHERE (is_hosting = true);


--
-- Name: idx_ip_addresses_is_proxy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_addresses_is_proxy ON public.ip_addresses USING btree (is_proxy) WHERE (is_proxy = true);


--
-- Name: idx_ip_addresses_isp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_addresses_isp ON public.ip_addresses USING btree (isp);


--
-- Name: idx_ip_addresses_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_addresses_org ON public.ip_addresses USING btree (organization_id);


--
-- Name: idx_ip_addresses_web_mentions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_addresses_web_mentions_gin ON public.ip_addresses USING gin (web_mentions);


--
-- Name: idx_leads_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_assigned_to ON public.leads USING btree (assigned_to);


--
-- Name: idx_leads_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_created_at ON public.leads USING btree (created_at);


--
-- Name: idx_leads_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_organization_id ON public.leads USING btree (organization_id);


--
-- Name: idx_leads_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_stage ON public.leads USING btree (stage);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status);


--
-- Name: idx_leaks_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leaks_fingerprint ON public.leaks USING btree (fingerprint);


--
-- Name: idx_leaks_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leaks_org ON public.leaks USING btree (organization_id);


--
-- Name: idx_monthly_billing_org_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monthly_billing_org_month ON public.monthly_billing USING btree (organization_id, billing_month);


--
-- Name: idx_paste_leaks_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paste_leaks_org ON public.paste_leaks USING btree (organization_id);


--
-- Name: idx_paste_leaks_web_mentions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paste_leaks_web_mentions_gin ON public.paste_leaks USING gin (web_mentions);


--
-- Name: idx_payment_intents_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_organization_id ON public.payment_intents USING btree (organization_id);


--
-- Name: idx_people_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_people_org ON public.people USING btree (organization_id);


--
-- Name: idx_people_web_mentions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_people_web_mentions_gin ON public.people USING gin (web_mentions);


--
-- Name: idx_phones_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phones_number ON public.phones USING btree (number_e164);


--
-- Name: idx_phones_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phones_org ON public.phones USING btree (organization_id);


--
-- Name: idx_phones_web_mentions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phones_web_mentions_gin ON public.phones USING gin (web_mentions);


--
-- Name: idx_properties_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_address ON public.properties USING btree (address_full);


--
-- Name: idx_properties_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_org ON public.properties USING btree (organization_id);


--
-- Name: idx_public_presence_run_items_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_presence_run_items_run ON public.public_presence_run_items USING btree (run_id);


--
-- Name: idx_public_presence_runs_entity_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_presence_runs_entity_ts ON public.public_presence_runs USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_refund_requests_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refund_requests_org ON public.refund_requests USING btree (organization_id);


--
-- Name: idx_refund_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refund_requests_status ON public.refund_requests USING btree (status, requested_at DESC);


--
-- Name: idx_refund_requests_stripe_charge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refund_requests_stripe_charge ON public.refund_requests USING btree (stripe_charge_id) WHERE (stripe_charge_id IS NOT NULL);


--
-- Name: idx_run_ai_suggestions_org_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_ai_suggestions_org_run ON public.run_ai_suggestions USING btree (organization_id, run_id);


--
-- Name: idx_run_ai_suggestions_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_run_ai_suggestions_run_id ON public.run_ai_suggestions USING btree (run_id);


--
-- Name: idx_social_profiles_handle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_profiles_handle ON public.social_profiles USING btree (handle);


--
-- Name: idx_social_profiles_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_profiles_org ON public.social_profiles USING btree (organization_id);


--
-- Name: idx_social_profiles_web_mentions_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_profiles_web_mentions_gin ON public.social_profiles USING gin (web_mentions);


--
-- Name: idx_stripe_charges_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_charges_customer ON public.stripe_charges USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);


--
-- Name: idx_stripe_charges_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_charges_invoice ON public.stripe_charges USING btree (stripe_invoice_id) WHERE (stripe_invoice_id IS NOT NULL);


--
-- Name: idx_stripe_charges_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_charges_org ON public.stripe_charges USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_stripe_charges_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_charges_status ON public.stripe_charges USING btree (status, created_at DESC);


--
-- Name: idx_stripe_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_customers_email ON public.stripe_customers USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_stripe_customers_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_customers_org ON public.stripe_customers USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_stripe_invoices_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_invoices_org_id ON public.stripe_invoices USING btree (org_id);


--
-- Name: idx_stripe_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_invoices_status ON public.stripe_invoices USING btree (status);


--
-- Name: idx_stripe_payment_failures_charge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_payment_failures_charge ON public.stripe_payment_failures USING btree (stripe_charge_id);


--
-- Name: idx_stripe_payment_failures_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_payment_failures_created ON public.stripe_payment_failures USING btree (created_at DESC);


--
-- Name: idx_stripe_payment_failures_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_payment_failures_invoice ON public.stripe_payment_failures USING btree (stripe_invoice_id);


--
-- Name: idx_stripe_payment_failures_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_payment_failures_org ON public.stripe_payment_failures USING btree (organization_id);


--
-- Name: idx_stripe_payment_methods_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_payment_methods_customer ON public.stripe_payment_methods USING btree (stripe_customer_id);


--
-- Name: idx_stripe_payment_methods_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_payment_methods_org ON public.stripe_payment_methods USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_stripe_refunds_charge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_refunds_charge ON public.stripe_refunds USING btree (stripe_charge_id);


--
-- Name: idx_stripe_refunds_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_refunds_org ON public.stripe_refunds USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_stripe_subscription_ledger_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_subscription_ledger_created ON public.stripe_subscription_ledger USING btree (created_at DESC);


--
-- Name: idx_stripe_subscription_ledger_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_subscription_ledger_org ON public.stripe_subscription_ledger USING btree (organization_id);


--
-- Name: idx_stripe_subscription_ledger_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_subscription_ledger_type ON public.stripe_subscription_ledger USING btree (event_type);


--
-- Name: idx_stripe_subscription_snapshots_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_subscription_snapshots_event ON public.stripe_subscription_snapshots USING btree (event_type);


--
-- Name: idx_stripe_subscription_snapshots_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_subscription_snapshots_subscription ON public.stripe_subscription_snapshots USING btree (stripe_subscription_id);


--
-- Name: idx_stripe_webhook_events_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhook_events_customer ON public.stripe_webhook_events USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);


--
-- Name: idx_stripe_webhook_events_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhook_events_organization_id ON public.stripe_webhook_events USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_stripe_webhook_events_received; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhook_events_received ON public.stripe_webhook_events USING btree (received_at DESC);


--
-- Name: idx_stripe_webhook_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhook_events_status ON public.stripe_webhook_events USING btree (status);


--
-- Name: idx_stripe_webhook_events_stripe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhook_events_stripe_id ON public.stripe_webhook_events USING btree (stripe_event_id);


--
-- Name: idx_stripe_webhook_events_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhook_events_subscription ON public.stripe_webhook_events USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);


--
-- Name: idx_stripe_webhook_events_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhook_events_type_date ON public.stripe_webhook_events USING btree (event_type, created_at DESC);


--
-- Name: idx_subscriptions_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_organization_id ON public.subscriptions USING btree (organization_id);


--
-- Name: idx_task_reminders_reminder_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reminders_reminder_time ON public.task_reminders USING btree (reminder_time);


--
-- Name: idx_task_reminders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reminders_status ON public.task_reminders USING btree (status);


--
-- Name: idx_task_reminders_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_reminders_task_id ON public.task_reminders USING btree (task_id);


--
-- Name: idx_tasks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created_at ON public.tasks USING btree (created_at);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);


--
-- Name: idx_tasks_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_lead_id ON public.tasks USING btree (lead_id);


--
-- Name: idx_tasks_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_organization_id ON public.tasks USING btree (organization_id);


--
-- Name: idx_tasks_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_owner_id ON public.tasks USING btree (owner_id);


--
-- Name: idx_tasks_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_usage_overage_catalog_env_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_overage_catalog_env_active ON public.usage_overage_catalog USING btree (env, active);


--
-- Name: idx_usage_transactions_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_transactions_org ON public.usage_transactions USING btree (organization_id, created_at DESC);


--
-- Name: idx_usage_wallet_auto_recharge_events_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_wallet_auto_recharge_events_org ON public.usage_wallet_auto_recharge_events USING btree (organization_id, created_at DESC);


--
-- Name: idx_usage_wallet_auto_recharge_org; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_usage_wallet_auto_recharge_org ON public.usage_wallet_auto_recharge USING btree (organization_id);


--
-- Name: idx_user_notification_settings_user_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notification_settings_user_org ON public.user_notification_settings USING btree (user_id, organization_id);


--
-- Name: idx_user_organizations_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_organizations_org_id ON public.user_organizations USING btree (organization_id);


--
-- Name: idx_user_organizations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_organizations_user_id ON public.user_organizations USING btree (user_id);


--
-- Name: idx_usernames_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usernames_org ON public.usernames USING btree (organization_id);


--
-- Name: images_exif_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX images_exif_gin ON public.images USING gin (exif);


--
-- Name: mention_decisions_organization_id_run_id_decision_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mention_decisions_organization_id_run_id_decision_idx ON public.mention_decisions USING btree (organization_id, run_id, decision);


--
-- Name: notifications_unique_reminder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notifications_unique_reminder_idx ON public.notifications USING btree (reminder_id) WHERE (reminder_id IS NOT NULL);


--
-- Name: notifications_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_created_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: run_entities_run_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX run_entities_run_id_idx ON public.run_entities USING btree (run_id);


--
-- Name: task_reminders_status_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_reminders_status_time_idx ON public.task_reminders USING btree (status, reminder_time);


--
-- Name: task_reminders_task_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX task_reminders_task_idx ON public.task_reminders USING btree (task_id);


--
-- Name: task_reminders_unique_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX task_reminders_unique_pending_idx ON public.task_reminders USING btree (task_id, reminder_time, COALESCE(notification_type, 'browser'::character varying)) WHERE (TRIM(BOTH FROM lower((status)::text)) = 'pending'::text);


--
-- Name: tasks_due_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_due_date_idx ON public.tasks USING btree (due_date);


--
-- Name: tasks_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_owner_idx ON public.tasks USING btree (owner_id);


--
-- Name: uq_case_evidence_storage_path; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_case_evidence_storage_path ON public.case_evidence USING btree (storage_path);


--
-- Name: usage_events_org_category_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_events_org_category_occurred_at_idx ON public.usage_events USING btree (org_id, category, occurred_at DESC);


--
-- Name: usage_events_org_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_events_org_occurred_at_idx ON public.usage_events USING btree (org_id, occurred_at DESC);


--
-- Name: usage_events_org_run_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usage_events_org_run_unique_idx ON public.usage_events USING btree (org_id, run_id) WHERE ((run_id IS NOT NULL) AND (COALESCE(is_duplicate, false) = false));


--
-- Name: usage_events_run_category_provider_unit_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usage_events_run_category_provider_unit_uidx ON public.usage_events USING btree (run_id, category, provider, unit) WHERE (run_id IS NOT NULL);


--
-- Name: usage_events_run_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_events_run_id_idx ON public.usage_events USING btree (run_id);


--
-- Name: usage_events_unique_run_provider_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usage_events_unique_run_provider_unit ON public.usage_events USING btree (run_id, provider, unit) WHERE (run_id IS NOT NULL);


--
-- Name: usage_topups_wallet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_topups_wallet_idx ON public.usage_topups USING btree (wallet_id, created_at);


--
-- Name: usage_transactions_unique_usage_debit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usage_transactions_unique_usage_debit ON public.usage_transactions USING btree (reference_type, reference_id, transaction_type) WHERE (transaction_type = 'usage_debit'::text);


--
-- Name: usage_transactions_wallet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_transactions_wallet_idx ON public.usage_transactions USING btree (wallet_id, created_at);


--
-- Name: usage_wallets_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_wallets_org_idx ON public.usage_wallets USING btree (organization_id);


--
-- Name: usage_wallets_organization_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usage_wallets_organization_unique ON public.usage_wallets USING btree (organization_id);


--
-- Name: ux_entity_edges_src_tgt; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_entity_edges_src_tgt ON public.entity_edges USING btree (source_type, source_id, target_type, target_id);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_26_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_26_inserted_at_topic_idx ON realtime.messages_2026_01_26 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_27_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_27_inserted_at_topic_idx ON realtime.messages_2026_01_27 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_28_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_28_inserted_at_topic_idx ON realtime.messages_2026_01_28 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_29_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_29_inserted_at_topic_idx ON realtime.messages_2026_01_29 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_30_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_30_inserted_at_topic_idx ON realtime.messages_2026_01_30 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_31_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_31_inserted_at_topic_idx ON realtime.messages_2026_01_31 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_02_01_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_02_01_inserted_at_topic_idx ON realtime.messages_2026_02_01 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2026_01_26_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_26_inserted_at_topic_idx;


--
-- Name: messages_2026_01_26_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_26_pkey;


--
-- Name: messages_2026_01_27_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_27_inserted_at_topic_idx;


--
-- Name: messages_2026_01_27_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_27_pkey;


--
-- Name: messages_2026_01_28_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_28_inserted_at_topic_idx;


--
-- Name: messages_2026_01_28_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_28_pkey;


--
-- Name: messages_2026_01_29_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_29_inserted_at_topic_idx;


--
-- Name: messages_2026_01_29_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_29_pkey;


--
-- Name: messages_2026_01_30_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_30_inserted_at_topic_idx;


--
-- Name: messages_2026_01_30_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_30_pkey;


--
-- Name: messages_2026_01_31_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_31_inserted_at_topic_idx;


--
-- Name: messages_2026_01_31_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_31_pkey;


--
-- Name: messages_2026_02_01_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_01_inserted_at_topic_idx;


--
-- Name: messages_2026_02_01_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_01_pkey;


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: chat_files chat_files_count_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER chat_files_count_trigger AFTER INSERT OR DELETE ON public.chat_files FOR EACH ROW EXECUTE FUNCTION public.update_session_file_count();


--
-- Name: investigators prevent_role_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_role_changes BEFORE UPDATE ON public.investigators FOR EACH ROW EXECUTE FUNCTION public.prevent_role_changes();


--
-- Name: addresses trg_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: case_category_catalog trg_audit_case_category_catalog; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_case_category_catalog AFTER INSERT OR DELETE OR UPDATE ON public.case_category_catalog FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: case_notes trg_audit_case_notes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_case_notes AFTER INSERT OR DELETE OR UPDATE ON public.case_notes FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: case_tag_catalog trg_audit_case_tag_catalog; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_case_tag_catalog AFTER INSERT OR DELETE OR UPDATE ON public.case_tag_catalog FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: cases trg_audit_cases; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_cases AFTER INSERT OR DELETE OR UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: people trg_audit_people; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_people AFTER INSERT OR DELETE OR UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: businesses trg_businesses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: case_category_catalog trg_case_category_catalog_before; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_case_category_catalog_before BEFORE INSERT OR UPDATE ON public.case_category_catalog FOR EACH ROW EXECUTE FUNCTION public.catalog_before_write();


--
-- Name: cases trg_case_default_assignee; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_case_default_assignee BEFORE INSERT ON public.cases FOR EACH ROW EXECUTE FUNCTION public.case_default_assignee();


--
-- Name: case_notes trg_case_notes_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_case_notes_set_updated_at BEFORE UPDATE ON public.case_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: case_reports trg_case_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_case_reports_updated_at BEFORE UPDATE ON public.case_reports FOR EACH ROW EXECUTE FUNCTION public.set_case_reports_updated_at();


--
-- Name: case_tag_catalog trg_case_tag_catalog_before; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_case_tag_catalog_before BEFORE INSERT OR UPDATE ON public.case_tag_catalog FOR EACH ROW EXECUTE FUNCTION public.catalog_before_write();


--
-- Name: businesses trg_cases_business_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cases_business_delete AFTER DELETE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.cases_null_on_business_delete();


--
-- Name: people trg_cases_person_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cases_person_delete AFTER DELETE ON public.people FOR EACH ROW EXECUTE FUNCTION public.cases_null_on_person_delete();


--
-- Name: cases trg_cases_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cases_set_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: documents trg_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: domains trg_domains_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_domains_updated_at BEFORE UPDATE ON public.domains FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: emails trg_emails_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_emails_updated_at BEFORE UPDATE ON public.emails FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subjects_legacy trg_entities_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_entities_set_updated_at BEFORE UPDATE ON public.subjects_legacy FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: images trg_images_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_images_updated_at BEFORE UPDATE ON public.images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ip_addresses trg_ip_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ip_addresses_updated_at BEFORE UPDATE ON public.ip_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leaks trg_leaks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_leaks_updated_at BEFORE UPDATE ON public.leaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: paste_leaks trg_paste_leaks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_paste_leaks_updated_at BEFORE UPDATE ON public.paste_leaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: people trg_people_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_people_updated_at BEFORE UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: phones trg_phones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_phones_updated_at BEFORE UPDATE ON public.phones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: properties trg_properties_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: social_profiles trg_social_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_social_profiles_updated_at BEFORE UPDATE ON public.social_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: usage_overage_catalog trg_touch_usage_overage_catalog_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_usage_overage_catalog_updated_at BEFORE UPDATE ON public.usage_overage_catalog FOR EACH ROW EXECUTE FUNCTION public.touch_usage_overage_catalog_updated_at();


--
-- Name: usernames trg_usernames_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_usernames_updated_at BEFORE UPDATE ON public.usernames FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: call_history trigger_calculate_call_duration; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_call_duration BEFORE INSERT OR UPDATE ON public.call_history FOR EACH ROW EXECUTE FUNCTION public.calculate_call_duration();


--
-- Name: tasks trigger_create_task_reminder; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_task_reminder AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.create_task_reminder();


--
-- Name: leads trigger_leads_notifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_leads_notifications AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.create_automatic_notification();


--
-- Name: task_reminders trigger_task_reminders; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_task_reminders AFTER INSERT ON public.task_reminders FOR EACH ROW EXECUTE FUNCTION public.create_automatic_notification();


--
-- Name: tasks trigger_tasks_notifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_tasks_notifications AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.create_automatic_notification();


--
-- Name: call_history trigger_update_call_history_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_call_history_updated_at BEFORE UPDATE ON public.call_history FOR EACH ROW EXECUTE FUNCTION public.update_call_history_updated_at();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_reminders update_task_reminders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_reminders_updated_at BEFORE UPDATE ON public.task_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_notification_settings update_user_notification_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON public.user_notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: action_results action_results_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_results
    ADD CONSTRAINT action_results_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: action_results action_results_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_results
    ADD CONSTRAINT action_results_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: addresses addresses_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: billing_settings billing_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_settings
    ADD CONSTRAINT billing_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: businesses businesses_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: call_history call_history_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_history
    ADD CONSTRAINT call_history_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: call_history call_history_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_history
    ADD CONSTRAINT call_history_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: call_history call_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_history
    ADD CONSTRAINT call_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: case_assignments case_assignments_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_assignments
    ADD CONSTRAINT case_assignments_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: case_assignments case_assignments_investigator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_assignments
    ADD CONSTRAINT case_assignments_investigator_id_fkey FOREIGN KEY (investigator_id) REFERENCES public.investigators(id) ON DELETE CASCADE;


--
-- Name: case_audit_log case_audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_audit_log
    ADD CONSTRAINT case_audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: case_audit_log case_audit_log_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_audit_log
    ADD CONSTRAINT case_audit_log_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: case_audit_log case_audit_log_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_audit_log
    ADD CONSTRAINT case_audit_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: case_evidence case_evidence_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_evidence
    ADD CONSTRAINT case_evidence_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: case_evidence case_evidence_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_evidence
    ADD CONSTRAINT case_evidence_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: case_evidence case_evidence_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_evidence
    ADD CONSTRAINT case_evidence_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: case_evidence case_evidence_uploader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_evidence
    ADD CONSTRAINT case_evidence_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: case_notes case_notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_notes
    ADD CONSTRAINT case_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: case_notes case_notes_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_notes
    ADD CONSTRAINT case_notes_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: case_notes case_notes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_notes
    ADD CONSTRAINT case_notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: case_reports case_reports_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_reports
    ADD CONSTRAINT case_reports_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE SET NULL;


--
-- Name: case_reports case_reports_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_reports
    ADD CONSTRAINT case_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: cases cases_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: chat_files chat_files_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_files
    ADD CONSTRAINT chat_files_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL;


--
-- Name: chat_files chat_files_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_files
    ADD CONSTRAINT chat_files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: chat_files chat_files_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_files
    ADD CONSTRAINT chat_files_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_files chat_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_files
    ADD CONSTRAINT chat_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- Name: chat_sessions chat_sessions_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE SET NULL;


--
-- Name: chat_sessions chat_sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;


--
-- Name: chat_sessions chat_sessions_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE SET NULL;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_usage_monthly chat_usage_monthly_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_usage_monthly
    ADD CONSTRAINT chat_usage_monthly_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: court_record_searches court_record_searches_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_record_searches
    ADD CONSTRAINT court_record_searches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: court_record_searches court_record_searches_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.court_record_searches
    ADD CONSTRAINT court_record_searches_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: dehashed_scans dehashed_scans_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dehashed_scans
    ADD CONSTRAINT dehashed_scans_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: document_contents document_contents_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_contents
    ADD CONSTRAINT document_contents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_entity_mentions document_entity_mentions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_entity_mentions
    ADD CONSTRAINT document_entity_mentions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: domain_ips domain_ips_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_ips
    ADD CONSTRAINT domain_ips_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.domains(id) ON DELETE CASCADE;


--
-- Name: domain_ips domain_ips_ip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_ips
    ADD CONSTRAINT domain_ips_ip_id_fkey FOREIGN KEY (ip_id) REFERENCES public.ip_addresses(id) ON DELETE CASCADE;


--
-- Name: domains domains_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domains
    ADD CONSTRAINT domains_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: email_breach_scans email_breach_scans_email_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_breach_scans
    ADD CONSTRAINT email_breach_scans_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_breach_scans email_breach_scans_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_breach_scans
    ADD CONSTRAINT email_breach_scans_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: email_paste_leaks email_paste_leaks_email_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_paste_leaks
    ADD CONSTRAINT email_paste_leaks_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_paste_leaks email_paste_leaks_paste_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_paste_leaks
    ADD CONSTRAINT email_paste_leaks_paste_id_fkey FOREIGN KEY (paste_id) REFERENCES public.paste_leaks(id) ON DELETE CASCADE;


--
-- Name: email_profiles email_profiles_email_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_profiles
    ADD CONSTRAINT email_profiles_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_profiles email_profiles_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_profiles
    ADD CONSTRAINT email_profiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.social_profiles(id) ON DELETE CASCADE;


--
-- Name: email_site_scans email_site_scans_email_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_site_scans
    ADD CONSTRAINT email_site_scans_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id) ON DELETE CASCADE;


--
-- Name: email_site_scans email_site_scans_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_site_scans
    ADD CONSTRAINT email_site_scans_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: emails emails_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: entity_document_mentions entity_document_mentions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_document_mentions
    ADD CONSTRAINT entity_document_mentions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: entity_evidence entity_evidence_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_evidence
    ADD CONSTRAINT entity_evidence_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: entity_evidence entity_evidence_mention_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_evidence
    ADD CONSTRAINT entity_evidence_mention_id_fkey FOREIGN KEY (mention_id) REFERENCES public.document_entity_mentions(id) ON DELETE SET NULL;


--
-- Name: entity_evidence entity_evidence_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_evidence
    ADD CONSTRAINT entity_evidence_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: entity_evidence entity_evidence_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_evidence
    ADD CONSTRAINT entity_evidence_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.public_presence_runs(id) ON DELETE SET NULL;


--
-- Name: images images_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: investigators investigators_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigators
    ADD CONSTRAINT investigators_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: investigators investigators_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investigators
    ADD CONSTRAINT investigators_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: invoice_snapshots invoice_snapshots_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_snapshots
    ADD CONSTRAINT invoice_snapshots_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: ip_addresses ip_addresses_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_addresses
    ADD CONSTRAINT ip_addresses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: leads leads_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: leads leads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: leads leads_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: leaks leaks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaks
    ADD CONSTRAINT leaks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: mention_decisions mention_decisions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mention_decisions
    ADD CONSTRAINT mention_decisions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: mention_decisions mention_decisions_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mention_decisions
    ADD CONSTRAINT mention_decisions_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.public_presence_runs(id) ON DELETE CASCADE;


--
-- Name: monthly_billing monthly_billing_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_billing
    ADD CONSTRAINT monthly_billing_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_reminder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES public.task_reminders(id) ON DELETE CASCADE;


--
-- Name: org_suspensions org_suspensions_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_suspensions
    ADD CONSTRAINT org_suspensions_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_invites organization_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: organization_invites organization_invites_invited_by_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_invited_by_fkey1 FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: organization_invites organization_invites_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: organizations organizations_owner_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey1 FOREIGN KEY (owner_id) REFERENCES public.profiles(id);


--
-- Name: paste_leaks paste_leaks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paste_leaks
    ADD CONSTRAINT paste_leaks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: payment_failure_events payment_failure_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_failure_events
    ADD CONSTRAINT payment_failure_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: payment_intents payment_intents_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: people people_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: subjects_legacy persons_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects_legacy
    ADD CONSTRAINT persons_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: phones phones_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phones
    ADD CONSTRAINT phones_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: profile_images profile_images_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_images
    ADD CONSTRAINT profile_images_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;


--
-- Name: profile_images profile_images_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_images
    ADD CONSTRAINT profile_images_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.social_profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: properties properties_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: public_presence_run_items public_presence_run_items_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_presence_run_items
    ADD CONSTRAINT public_presence_run_items_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: public_presence_run_items public_presence_run_items_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_presence_run_items
    ADD CONSTRAINT public_presence_run_items_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.public_presence_runs(id) ON DELETE CASCADE;


--
-- Name: refund_requests refund_requests_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: refund_requests refund_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: refund_requests refund_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: run_ai_suggestions run_ai_suggestions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_ai_suggestions
    ADD CONSTRAINT run_ai_suggestions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: run_ai_suggestions run_ai_suggestions_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_ai_suggestions
    ADD CONSTRAINT run_ai_suggestions_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.public_presence_runs(id) ON DELETE CASCADE;


--
-- Name: run_entities run_entities_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_entities
    ADD CONSTRAINT run_entities_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.public_presence_runs(id) ON DELETE CASCADE;


--
-- Name: seat_events seat_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_events
    ADD CONSTRAINT seat_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: seat_events seat_events_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_events
    ADD CONSTRAINT seat_events_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE SET NULL;


--
-- Name: seats seats_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: seats seats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: social_profiles social_profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_profiles
    ADD CONSTRAINT social_profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: stripe_charges stripe_charges_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_charges
    ADD CONSTRAINT stripe_charges_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: stripe_customers stripe_customers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_customers
    ADD CONSTRAINT stripe_customers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: stripe_invoices stripe_invoices_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_invoices
    ADD CONSTRAINT stripe_invoices_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: stripe_payment_failures stripe_payment_failures_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_payment_failures
    ADD CONSTRAINT stripe_payment_failures_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: stripe_payment_methods stripe_payment_methods_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_payment_methods
    ADD CONSTRAINT stripe_payment_methods_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: stripe_refunds stripe_refunds_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_refunds
    ADD CONSTRAINT stripe_refunds_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: stripe_subscription_ledger stripe_subscription_ledger_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_subscription_ledger
    ADD CONSTRAINT stripe_subscription_ledger_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: stripe_subscription_snapshots stripe_subscription_snapshots_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_subscription_snapshots
    ADD CONSTRAINT stripe_subscription_snapshots_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: stripe_webhook_events stripe_webhook_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: stripe_webhook_events stripe_webhook_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: subscription_ledger subscription_ledger_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_ledger
    ADD CONSTRAINT subscription_ledger_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: task_reminders task_reminders_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_reminders
    ADD CONSTRAINT task_reminders_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: usage_events usage_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: usage_events usage_events_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.public_presence_runs(id) ON DELETE SET NULL;


--
-- Name: usage_events usage_events_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id);


--
-- Name: usage_period_rollups usage_period_rollups_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_period_rollups
    ADD CONSTRAINT usage_period_rollups_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: usage_topups usage_topups_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_topups
    ADD CONSTRAINT usage_topups_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.usage_wallets(id) ON DELETE CASCADE;


--
-- Name: usage_transactions usage_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_transactions
    ADD CONSTRAINT usage_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.usage_wallets(id) ON DELETE CASCADE;


--
-- Name: usage_wallet_auto_recharge_events usage_wallet_auto_recharge_events_auto_recharge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_wallet_auto_recharge_events
    ADD CONSTRAINT usage_wallet_auto_recharge_events_auto_recharge_id_fkey FOREIGN KEY (auto_recharge_id) REFERENCES public.usage_wallet_auto_recharge(id) ON DELETE CASCADE;


--
-- Name: usage_wallet_auto_recharge_events usage_wallet_auto_recharge_events_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_wallet_auto_recharge_events
    ADD CONSTRAINT usage_wallet_auto_recharge_events_org_fkey FOREIGN KEY (organization_id) REFERENCES public.usage_wallet_auto_recharge(organization_id) ON DELETE CASCADE;


--
-- Name: usage_wallet_auto_recharge_events usage_wallet_auto_recharge_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_wallet_auto_recharge_events
    ADD CONSTRAINT usage_wallet_auto_recharge_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: usage_wallet_auto_recharge usage_wallet_auto_recharge_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_wallet_auto_recharge
    ADD CONSTRAINT usage_wallet_auto_recharge_org_fkey FOREIGN KEY (organization_id) REFERENCES public.usage_wallets(organization_id) ON DELETE CASCADE;


--
-- Name: usage_wallet_auto_recharge usage_wallet_auto_recharge_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_wallet_auto_recharge
    ADD CONSTRAINT usage_wallet_auto_recharge_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: usage_wallets usage_wallets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_wallets
    ADD CONSTRAINT usage_wallets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: user_notification_settings user_notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_organizations user_organizations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: user_organizations user_organizations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_organizations user_organizations_user_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: usernames usernames_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usernames
    ADD CONSTRAINT usernames_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations Admins can delete organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete organization" ON public.organizations FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.investigators
  WHERE ((investigators.organization_id = organizations.id) AND (investigators.id = auth.uid()) AND (investigators.role = 'admin'::public.investigator_role)))));


--
-- Name: organizations Admins can update organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update organization" ON public.organizations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.investigators
  WHERE ((investigators.organization_id = organizations.id) AND (investigators.id = auth.uid()) AND (investigators.role = 'admin'::public.investigator_role)))));


--
-- Name: investigators All org members can view all investigators in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All org members can view all investigators in their org" ON public.investigators FOR SELECT USING (public.is_org_member(organization_id, auth.uid()));


--
-- Name: profiles Allow all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all profiles" ON public.profiles USING (true);


--
-- Name: user_organizations Allow all user_organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all user_organizations" ON public.user_organizations USING (true);


--
-- Name: organization_invites Anyone can accept invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can accept invitations" ON public.organization_invites FOR UPDATE USING (true);


--
-- Name: cases Assigned investigators can view case; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Assigned investigators can view case" ON public.cases FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.case_assignments
     JOIN public.investigators ON ((case_assignments.investigator_id = investigators.id)))
  WHERE ((case_assignments.case_id = cases.id) AND (investigators.id = auth.uid())))));


--
-- Name: usage_overage_catalog Authenticated can view usage overage catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view usage overage catalog" ON public.usage_overage_catalog FOR SELECT TO authenticated USING (true);


--
-- Name: organization_invites Only admins can create invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can create invites" ON public.organization_invites FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.investigators i
  WHERE ((i.organization_id = organization_invites.organization_id) AND (i.profile_id = auth.uid()) AND (i.role = 'admin'::public.investigator_role)))));


--
-- Name: investigators Only admins can delete investigators (not themselves); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete investigators (not themselves)" ON public.investigators FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.investigators i
  WHERE ((i.organization_id = investigators.organization_id) AND (i.profile_id = auth.uid()) AND (i.role = 'admin'::public.investigator_role)))) AND (profile_id <> auth.uid())));


--
-- Name: organization_invites Only admins can delete invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete invites" ON public.organization_invites FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.investigators i
  WHERE ((i.organization_id = organization_invites.organization_id) AND (i.profile_id = auth.uid()) AND (i.role = 'admin'::public.investigator_role)))));


--
-- Name: investigators Only admins can update investigators (not themselves); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update investigators (not themselves)" ON public.investigators FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.investigators i
  WHERE ((i.organization_id = investigators.organization_id) AND (i.profile_id = auth.uid()) AND (i.role = 'admin'::public.investigator_role)))) AND (profile_id <> auth.uid())));


--
-- Name: organization_invites Only owners can manage invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only owners can manage invitations" ON public.organization_invites USING ((EXISTS ( SELECT 1
   FROM public.organizations
  WHERE ((organizations.id = organization_invites.organization_id) AND (organizations.owner_id = auth.uid())))));


--
-- Name: organizations Only owners can update their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only owners can update their organizations" ON public.organizations FOR UPDATE USING ((auth.uid() = owner_id));


--
-- Name: organizations Org members can view organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view organization" ON public.organizations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.investigators
  WHERE ((investigators.organization_id = organizations.id) AND (investigators.id = auth.uid())))));


--
-- Name: leads Organization members can delete leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization members can delete leads" ON public.leads FOR DELETE USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: leads Organization members can insert leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization members can insert leads" ON public.leads FOR INSERT WITH CHECK ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: leads Organization members can update leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization members can update leads" ON public.leads FOR UPDATE USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid())))) WITH CHECK ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: leads Organization members can view leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization members can view leads" ON public.leads FOR SELECT USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: user_organizations Organization owners can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization owners can manage members" ON public.user_organizations USING (public.is_organization_owner(organization_id));


--
-- Name: organizations Organization owners can update their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization owners can update their organization" ON public.organizations FOR UPDATE USING ((owner_id = auth.uid()));


--
-- Name: organization_invites Public access to invitations by ID; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public access to invitations by ID" ON public.organization_invites FOR SELECT USING (true);


--
-- Name: profiles Public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access" ON public.profiles FOR SELECT USING (true);


--
-- Name: action_results Users can create action results for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create action results for their organization" ON public.action_results FOR INSERT WITH CHECK ((organization_id IN ( SELECT action_results.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: email_breach_scans Users can create breach scans for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create breach scans for their organization" ON public.email_breach_scans FOR INSERT WITH CHECK ((organization_id IN ( SELECT email_breach_scans.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: email_site_scans Users can create email scans for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create email scans for their organization" ON public.email_site_scans FOR INSERT WITH CHECK ((organization_id IN ( SELECT email_site_scans.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: task_reminders Users can create reminders for accessible tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reminders for accessible tasks" ON public.task_reminders FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.organization_id IN ( SELECT tasks.organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: tasks Users can create tasks in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tasks in their organization" ON public.tasks FOR INSERT WITH CHECK ((organization_id IN ( SELECT tasks.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: call_history Users can delete calls from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete calls from their organization" ON public.call_history FOR DELETE USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: task_reminders Users can delete reminders for accessible tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete reminders for accessible tasks" ON public.task_reminders FOR DELETE USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.organization_id IN ( SELECT tasks.organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: action_results Users can delete their organization's action results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their organization's action results" ON public.action_results FOR DELETE USING ((organization_id IN ( SELECT action_results.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: email_breach_scans Users can delete their organization's breach scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their organization's breach scans" ON public.email_breach_scans FOR DELETE USING ((organization_id IN ( SELECT email_breach_scans.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: dehashed_scans Users can delete their organization's dehashed scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their organization's dehashed scans" ON public.dehashed_scans FOR DELETE USING ((organization_id IN ( SELECT dehashed_scans.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: email_site_scans Users can delete their organization's email scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their organization's email scans" ON public.email_site_scans FOR DELETE USING ((organization_id IN ( SELECT email_site_scans.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: profiles Users can delete their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING ((auth.uid() = id));


--
-- Name: tasks Users can delete their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING (((owner_id = auth.uid()) AND (organization_id IN ( SELECT tasks.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: call_history Users can insert calls for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert calls for their organization" ON public.call_history FOR INSERT WITH CHECK ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: court_record_searches Users can insert court searches for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert court searches for their organization" ON public.court_record_searches FOR INSERT WITH CHECK ((organization_id IN ( SELECT court_record_searches.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: dehashed_scans Users can insert dehashed scans for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert dehashed scans for their organization" ON public.dehashed_scans FOR INSERT WITH CHECK ((organization_id IN ( SELECT dehashed_scans.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: task_reminders Users can insert task reminders for their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert task reminders for their tasks" ON public.task_reminders FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.owner_id = auth.uid()))));


--
-- Name: investigators Users can insert their own investigator profile or admins can i; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own investigator profile or admins can i" ON public.investigators FOR INSERT WITH CHECK (((auth.uid() = profile_id) OR (EXISTS ( SELECT 1
   FROM public.investigators i
  WHERE ((i.organization_id = investigators.organization_id) AND (i.profile_id = auth.uid()) AND (i.role = 'admin'::public.investigator_role))))));


--
-- Name: user_organizations Users can insert their own memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own memberships" ON public.user_organizations FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_notification_settings Users can insert their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notification settings" ON public.user_notification_settings FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: billing_settings Users can update billing settings (admins); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update billing settings (admins)" ON public.billing_settings FOR UPDATE TO authenticated USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE ((user_organizations.user_id = auth.uid()) AND ((user_organizations.role)::text = 'admin'::text)))));


--
-- Name: call_history Users can update calls from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update calls from their organization" ON public.call_history FOR UPDATE USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: task_reminders Users can update reminders for accessible tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update reminders for accessible tasks" ON public.task_reminders FOR UPDATE USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.organization_id IN ( SELECT tasks.organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: task_reminders Users can update task reminders for their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update task reminders for their tasks" ON public.task_reminders FOR UPDATE USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.owner_id = auth.uid()))));


--
-- Name: user_notification_settings Users can update their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notification settings" ON public.user_notification_settings FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: tasks Users can update their own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING (((owner_id = auth.uid()) AND (organization_id IN ( SELECT tasks.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: call_history Users can view calls from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view calls from their organization" ON public.call_history FOR SELECT USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: organization_invites Users can view invitations in their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invitations in their organizations" ON public.organization_invites FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_organizations
  WHERE ((user_organizations.organization_id = organization_invites.organization_id) AND (user_organizations.user_id = auth.uid())))));


--
-- Name: organization_invites Users can view invites for their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invites for their organizations" ON public.organization_invites FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.organizations
  WHERE (((organizations.id = organization_invites.organization_id) AND (organizations.owner_id = auth.uid())) OR (EXISTS ( SELECT 1
           FROM public.investigators i
          WHERE ((i.organization_id = organizations.id) AND (i.profile_id = auth.uid()) AND (i.role = 'admin'::public.investigator_role))))))));


--
-- Name: organizations Users can view organizations they belong to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view organizations they belong to" ON public.organizations FOR SELECT USING ((id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: task_reminders Users can view reminders for accessible tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reminders for accessible tasks" ON public.task_reminders FOR SELECT USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.organization_id IN ( SELECT tasks.organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: task_reminders Users can view task reminders for their tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view task reminders for their tasks" ON public.task_reminders FOR SELECT USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.owner_id = auth.uid()))));


--
-- Name: tasks Users can view tasks from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tasks from their organization" ON public.tasks FOR SELECT USING ((organization_id IN ( SELECT tasks.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: billing_settings Users can view their organization billing settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization billing settings" ON public.billing_settings FOR SELECT TO authenticated USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: monthly_billing Users can view their organization monthly billing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization monthly billing" ON public.monthly_billing FOR SELECT TO authenticated USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: action_results Users can view their organization's action results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization's action results" ON public.action_results FOR SELECT USING ((organization_id IN ( SELECT action_results.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: email_breach_scans Users can view their organization's breach scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization's breach scans" ON public.email_breach_scans FOR SELECT USING ((organization_id IN ( SELECT email_breach_scans.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: court_record_searches Users can view their organization's court searches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization's court searches" ON public.court_record_searches FOR SELECT USING ((organization_id IN ( SELECT court_record_searches.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: dehashed_scans Users can view their organization's dehashed scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization's dehashed scans" ON public.dehashed_scans FOR SELECT USING ((organization_id IN ( SELECT dehashed_scans.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: email_site_scans Users can view their organization's email scans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization's email scans" ON public.email_site_scans FOR SELECT USING ((organization_id IN ( SELECT email_site_scans.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: invoices Users can view their organization's invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization's invoices" ON public.invoices FOR SELECT USING ((subscription_id IN ( SELECT s.id
   FROM (public.subscriptions s
     JOIN public.investigators i ON ((i.organization_id = s.organization_id)))
  WHERE (i.profile_id = auth.uid()))));


--
-- Name: payment_intents Users can view their organization's payment intents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization's payment intents" ON public.payment_intents FOR SELECT USING ((organization_id IN ( SELECT investigators.organization_id
   FROM public.investigators
  WHERE (investigators.profile_id = auth.uid()))));


--
-- Name: subscriptions Users can view their organization's subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization's subscriptions" ON public.subscriptions FOR SELECT USING ((organization_id IN ( SELECT investigators.organization_id
   FROM public.investigators
  WHERE (investigators.profile_id = auth.uid()))));


--
-- Name: user_organizations Users can view their own memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own memberships" ON public.user_organizations FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_notification_settings Users can view their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification settings" ON public.user_notification_settings FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: organizations Users can view their own organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own organizations" ON public.organizations FOR SELECT USING (((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM public.investigators
  WHERE ((investigators.organization_id = organizations.id) AND (investigators.profile_id = auth.uid()))))));


--
-- Name: action_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.action_results ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_files ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_files chat_files_org_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chat_files_org_policy ON public.chat_files USING ((organization_id IN ( SELECT chat_files.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages chat_messages_session_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chat_messages_session_policy ON public.chat_messages USING ((session_id IN ( SELECT chat_sessions.id
   FROM public.chat_sessions
  WHERE (chat_sessions.organization_id IN ( SELECT chat_sessions.organization_id
           FROM public.seats
          WHERE (seats.user_id = auth.uid()))))));


--
-- Name: chat_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_sessions chat_sessions_org_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chat_sessions_org_policy ON public.chat_sessions USING ((organization_id IN ( SELECT chat_sessions.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: chat_usage_monthly; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_usage_monthly ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_usage_monthly chat_usage_org_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY chat_usage_org_policy ON public.chat_usage_monthly USING ((organization_id IN ( SELECT chat_usage_monthly.organization_id
   FROM public.seats
  WHERE (seats.user_id = auth.uid()))));


--
-- Name: court_record_searches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.court_record_searches ENABLE ROW LEVEL SECURITY;

--
-- Name: dehashed_scans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dehashed_scans ENABLE ROW LEVEL SECURITY;

--
-- Name: email_breach_scans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_breach_scans ENABLE ROW LEVEL SECURITY;

--
-- Name: email_site_scans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_site_scans ENABLE ROW LEVEL SECURITY;

--
-- Name: investigators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investigators ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_owner_read ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: organization_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_intents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: refund_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: task_reminders reminders_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reminders_owner_read ON public.task_reminders FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tasks t
  WHERE ((t.id = task_reminders.task_id) AND (t.owner_id = auth.uid())))));


--
-- Name: refund_requests service_refund_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_refund_requests ON public.refund_requests TO service_role USING (true) WITH CHECK (true);


--
-- Name: stripe_charges service_stripe_charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_stripe_charges ON public.stripe_charges TO service_role USING (true) WITH CHECK (true);


--
-- Name: stripe_customers service_stripe_customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_stripe_customers ON public.stripe_customers TO service_role USING (true) WITH CHECK (true);


--
-- Name: stripe_payment_failures service_stripe_payment_failures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_stripe_payment_failures ON public.stripe_payment_failures TO service_role USING (true) WITH CHECK (true);


--
-- Name: stripe_payment_methods service_stripe_payment_methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_stripe_payment_methods ON public.stripe_payment_methods TO service_role USING (true) WITH CHECK (true);


--
-- Name: stripe_refunds service_stripe_refunds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_stripe_refunds ON public.stripe_refunds TO service_role USING (true) WITH CHECK (true);


--
-- Name: stripe_subscription_ledger service_stripe_subscription_ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_stripe_subscription_ledger ON public.stripe_subscription_ledger TO service_role USING (true) WITH CHECK (true);


--
-- Name: stripe_charges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_charges ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_payment_failures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_payment_failures ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_payment_methods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_refunds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_refunds ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_subscription_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_subscription_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: stripe_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks tasks_owner_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_owner_rw ON public.tasks USING ((auth.uid() = owner_id)) WITH CHECK ((auth.uid() = owner_id));


--
-- Name: refund_requests users_create_refund_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_create_refund_requests ON public.refund_requests FOR INSERT TO authenticated WITH CHECK ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: stripe_charges users_stripe_charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_stripe_charges ON public.stripe_charges FOR SELECT TO authenticated USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: stripe_customers users_stripe_customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_stripe_customers ON public.stripe_customers FOR SELECT TO authenticated USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: stripe_payment_failures users_stripe_payment_failures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_stripe_payment_failures ON public.stripe_payment_failures FOR SELECT TO authenticated USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: stripe_payment_methods users_stripe_payment_methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_stripe_payment_methods ON public.stripe_payment_methods FOR SELECT TO authenticated USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: stripe_refunds users_stripe_refunds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_stripe_refunds ON public.stripe_refunds FOR SELECT TO authenticated USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: stripe_subscription_ledger users_stripe_subscription_ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_stripe_subscription_ledger ON public.stripe_subscription_ledger FOR SELECT TO authenticated USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: refund_requests users_view_refund_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_view_refund_requests ON public.refund_requests FOR SELECT TO authenticated USING ((organization_id IN ( SELECT user_organizations.organization_id
   FROM public.user_organizations
  WHERE (user_organizations.user_id = auth.uid()))));


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Authenticated users can upload to avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Authenticated users can upload to avatars" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Only owner can delete their avatar; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Only owner can delete their avatar" ON storage.objects FOR DELETE USING (((bucket_id = 'avatars'::text) AND ((metadata ->> 'user_id'::text) = (auth.uid())::text)));


--
-- Name: objects Org read access; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Org read access" ON storage.objects FOR SELECT TO authenticated USING ((bucket_id = 'chat-files'::text));


--
-- Name: objects Org upload access; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Org upload access" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'chat-files'::text));


--
-- Name: objects Public read access to avatars; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Public read access to avatars" ON storage.objects FOR SELECT USING ((bucket_id = 'avatars'::text));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: objects evidence delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "evidence delete" ON storage.objects FOR DELETE USING ((bucket_id = 'evidence'::text));


--
-- Name: objects evidence insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "evidence insert" ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'evidence'::text));


--
-- Name: objects evidence read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "evidence read" ON storage.objects FOR SELECT USING ((bucket_id = 'evidence'::text));


--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime notifications; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.notifications;


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict 9Hb8wlFvLrmSajEWq1ngxyEdiRILF1jeMeQinO1eMao4Y9V8Ijj6kdiJaOfZXgt

