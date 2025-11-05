-- Fix audit_row_change: use to_jsonb(NEW/OLD) when extracting fields
-- Prevents errors like: operator does not exist: cases ->> unknown

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;


