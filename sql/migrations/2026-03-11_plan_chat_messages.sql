-- Fin (AI Assistant) as regular plan feature — set included_chat_messages per plan.
-- Builder: no Fin. Growth, Scale, Pro: Fin included with tiered message allowances.

UPDATE public.plan_catalog SET included_chat_messages = 0 WHERE plan_code IN ('builder', 'builder_test');
UPDATE public.plan_catalog SET included_chat_messages = 200 WHERE plan_code IN ('growth', 'growth_test');
UPDATE public.plan_catalog SET included_chat_messages = 500 WHERE plan_code IN ('scale', 'scale_test');
UPDATE public.plan_catalog SET included_chat_messages = 500 WHERE plan_code IN ('pro', 'pro_test');
