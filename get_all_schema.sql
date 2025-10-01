WITH tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
),
cols AS (
  SELECT
    table_name,
    column_name,
    ordinal_position,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
  FROM information_schema.columns
  WHERE table_schema = 'public'
),
pks AS (
  SELECT
    tc.table_name,
    json_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS pk_cols
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.table_schema = tc.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'PRIMARY KEY'
  GROUP BY tc.table_name
),
fks AS (
  SELECT
    tc.table_name,
    json_agg(
      json_build_object(
        'column', kcu.column_name,
        'ref_table', ccu.table_name,
        'ref_column', ccu.column_name,
        'on_update', rc.update_rule,
        'on_delete', rc.delete_rule
      ) ORDER BY kcu.ordinal_position
    ) AS fks
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.table_schema = tc.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema = tc.table_schema
  JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
   AND rc.constraint_schema = tc.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'
  GROUP BY tc.table_name
),
uniqs AS (
  SELECT
    tc.table_name,
    json_agg(
      json_build_object('name', tc.constraint_name,
                        'columns', (
                          SELECT json_agg(kcu.column_name ORDER BY kcu.ordinal_position)
                          FROM information_schema.key_column_usage kcu
                          WHERE kcu.constraint_name = tc.constraint_name
                            AND kcu.table_schema = tc.table_schema
                        )
      ) ORDER BY tc.constraint_name
    ) AS uniques
  FROM information_schema.table_constraints tc
  WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'UNIQUE'
  GROUP BY tc.table_name
),
idx AS (
  SELECT
    t.relname AS table_name,
    json_agg(pg_get_indexdef(ix.indexrelid) ORDER BY i.relname) AS indexes
  FROM pg_class t
  JOIN pg_index ix ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relkind = 'r'
  GROUP BY t.relname
),
pol AS (
  SELECT
    rel.relname AS table_name,
    json_agg(
      json_build_object(
        'name', pol.polname,
        'cmd', pol.polcmd,
        'using', pg_get_expr(pol.polqual, pol.polrelid),
        'check', pg_get_expr(pol.polwithcheck, pol.polrelid)
      ) ORDER BY pol.polname
    ) AS policies
  FROM pg_policy pol
  JOIN pg_class rel ON rel.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = rel.relnamespace
  WHERE n.nspname = 'public'
  GROUP BY rel.relname
)
SELECT jsonb_pretty(
  jsonb_agg(
    jsonb_build_object(
      'table', t.table_name,
      'columns', (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'name', c.column_name,
                   'type', c.data_type,
                   'nullable', (c.is_nullable = 'YES'),
                   'default', c.column_default,
                   'char_max_len', c.character_maximum_length,
                   'num_precision', c.numeric_precision,
                   'num_scale', c.numeric_scale
                 )
                 ORDER BY c.ordinal_position
               )
        FROM cols c
        WHERE c.table_name = t.table_name
      ),
      'primary_key', COALESCE((SELECT to_jsonb(pk.pk_cols) FROM pks pk WHERE pk.table_name = t.table_name), '[]'::jsonb),
      'foreign_keys', COALESCE((SELECT to_jsonb(fk.fks) FROM fks fk WHERE fk.table_name = t.table_name), '[]'::jsonb),
      'unique_constraints', COALESCE((SELECT to_jsonb(u.uniques) FROM uniqs u WHERE u.table_name = t.table_name), '[]'::jsonb),
      'indexes', COALESCE((SELECT to_jsonb(ix.indexes) FROM idx ix WHERE ix.table_name = t.table_name), '[]'::jsonb),
      'rls_policies', COALESCE((SELECT to_jsonb(p.policies) FROM pol p WHERE p.table_name = t.table_name), '[]'::jsonb)
    )
    ORDER BY t.table_name
  )
) AS public_schema_snapshot
FROM tables t;

-- Views (definition)
SELECT table_name AS view_name,
       pg_get_viewdef(format('%I.%I', table_schema, table_name)::regclass, true) AS definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY view_name;

-- Functions (signature + definition)
SELECT
  n.nspname AS schema,
  p.proname AS function,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY 1, 2;