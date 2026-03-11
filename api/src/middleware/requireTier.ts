/**
 * requireTier — Gate API endpoints by plan tier.
 * Must run after requireAuth (needs req.user).
 * Returns 403 with upgrade hint when org plan is below required tier.
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient.js';

const TIER_ORDER = ['builder', 'growth', 'scale', 'pro'] as const;
type Tier = (typeof TIER_ORDER)[number];

function toBaseTier(planCode: string | null): Tier | null {
  if (!planCode || typeof planCode !== 'string') return null;
  const base = planCode.replace(/_test$/, '');
  return TIER_ORDER.includes(base as Tier) ? (base as Tier) : null;
}

function hasPlanAtLeast(planCode: string | null, required: Tier): boolean {
  const plan = toBaseTier(planCode);
  if (!plan) return false;
  const requiredIdx = TIER_ORDER.indexOf(required);
  const currentIdx = TIER_ORDER.indexOf(plan);
  return currentIdx >= requiredIdx;
}

export function requireTier(requiredTier: Tier) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as Request & { userId?: string }).userId ?? req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'auth_required' });
        return;
      }

      // Use organizationId from requireOrgForChat when available (e.g. x-organization-id header)
      const orgIdFromReq = (req as Request & { organizationId?: string }).organizationId;

      let orgId: string | null = orgIdFromReq ?? null;
      if (!orgId) {
        const { data: userOrg } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        orgId = userOrg?.organization_id ?? null;
      }

      if (!orgId) {
        res.status(403).json({ error: 'No organization', code: 'tier_required', requiredTier });
        return;
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('plan_code')
        .eq('id', orgId)
        .single();

      const planCode = org?.plan_code ?? null;
      if (!hasPlanAtLeast(planCode, requiredTier)) {
        res.status(403).json({
          error: `${requiredTier} plan or higher required`,
          code: 'tier_required',
          requiredTier
        });
        return;
      }

      next();
    } catch (err) {
      console.error('[requireTier] Error:', err);
      res.status(500).json({ error: 'Failed to verify plan tier' });
    }
  };
}
