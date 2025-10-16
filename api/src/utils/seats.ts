import { supabase } from './supabaseClient';
import { HttpError } from '../error/httpError';
import type { PlanCatalogRow } from '../types/billing';
import { getStripeClient } from './stripe';

interface SupabaseSeatRow {
  id: string;
  org_id: string;
  user_id: string | null;
  status: string;
  created_at: string;
}

interface SupabaseSeatEventRow {
  id: string;
  org_id: string;
  seat_id: string | null;
  action: string;
  reason: string | null;
  delta: number;
  stripe_item_id: string | null;
  created_at: string;
}

interface SupabaseMemberRow {
  user_id: string;
}

export interface SeatSummaryData {
  includedSeats: number;
  extraSeatsPurchased: number;
  capacity: number;
  assignedSeats: number;
  availableSeats: number;
  extraSeatsUsed: number;
  extraSeatUnitPriceCents: number | null;
  extraSeatMonthlyCostCents: number | null;
  planCode: string | null;
  planPriceCents: number | null;
  nextPlan: Pick<PlanCatalogRow, 'plan_code' | 'name' | 'included_seats' | 'base_price_cents'> | null;
  limitBeforeUpgrade: number | null;
  reachedUpgradeThreshold: boolean;
  maxExtraSeatsBeforeUpgrade: number | null;
  extraSeatsRemainingBeforeUpgrade: number | null;
  upgradeMessage: string | null;
  extraSeatAvailable: boolean;
	extraSeatAddonCode: string | null;
	extraSeatAddonPriceId: string | null;
	stripeSubscriptionId: string | null;
	twilioSubaccountSid: string | null;
	twilioMessagingServiceSid: string | null;
	seatEvents: SupabaseSeatEventRow[];
	seats: SupabaseSeatRow[];
	phoneNumbers: {
		id: string;
		sid: string;
		phone_number: string;
		seat_id: string | null;
		status: string;
		capabilities: Record<string, unknown> | null;
	}[];
}

async function ensureSeatAssignmentsFromMembers(orgId: string) {
  const [{ data: seatRows, error: seatError }, { data: memberRows, error: memberError }] = await Promise.all([
    supabase
      .from('seats')
      .select('id, org_id, user_id, status, created_at')
      .eq('org_id', orgId),
    supabase
      .from('user_organizations')
      .select('user_id')
      .eq('organization_id', orgId)
  ]);

  if (seatError) {
    throw seatError;
  }

  if (memberError) {
    throw memberError;
  }

  const seatList: SupabaseSeatRow[] = seatRows ?? [];
  const memberList: SupabaseMemberRow[] = memberRows ?? [];

  if (memberList.length === 0) {
    if (seatList.length > 0) {
      const inactiveIds = seatList.map((s) => s.id);
      await supabase
        .from('seats')
        .update({ status: 'inactive', user_id: null })
        .in('id', inactiveIds);
    }
    return;
  }

  const memberIds = new Set(memberList.map((row) => row.user_id));

  const seatsByUser = new Map<string, SupabaseSeatRow>();
  seatList.forEach((seat) => {
    if (seat.user_id) {
      seatsByUser.set(seat.user_id, seat);
    }
  });

  const seatsToReactivate = seatList
    .filter((seat) => seat.user_id && memberIds.has(seat.user_id) && seat.status !== 'active')
    .map((seat) => seat.id);

  if (seatsToReactivate.length > 0) {
    await supabase
      .from('seats')
      .update({ status: 'active' })
      .in('id', seatsToReactivate);
  }

  const missingMemberIds = memberList
    .filter((member) => !seatsByUser.has(member.user_id))
    .map((member) => member.user_id);

  if (missingMemberIds.length > 0) {
    const inserts = missingMemberIds.map((userId) => ({
      org_id: orgId,
      user_id: userId,
      status: 'active'
    }));

    await supabase.from('seats').insert(inserts);
  }

  const seatsToDeactivate = seatList
    .filter((seat) => seat.user_id && !memberIds.has(seat.user_id))
    .map((seat) => seat.id);

  if (seatsToDeactivate.length > 0) {
    await supabase
      .from('seats')
      .update({ status: 'inactive', user_id: null })
      .in('id', seatsToDeactivate);
  }
}

function calculateExtraSeatUnitPrice(planPriceCents: number | null, includedSeats: number): number | null {
  if (!planPriceCents || includedSeats <= 0) {
    return null;
  }

  return Math.round(planPriceCents / includedSeats);
}

export async function loadSeatSummary(orgId: string): Promise<SeatSummaryData> {
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
	.select('id, plan_code, plan_price_cents, included_seats, max_seats, stripe_subscription_id, twilio_subaccount_sid, twilio_messaging_service_sid')
    .eq('id', orgId)
    .single();

  if (orgError || !organization) {
    throw new HttpError('Organization not found', 404);
  }

  await ensureSeatAssignmentsFromMembers(orgId);

  const [{ data: seatRows, error: seatError }, { data: seatEvents, error: eventError }, assignedCountResult, { data: phoneNumbers, error: phoneError }] = await Promise.all([
    supabase
      .from('seats')
      .select('id, org_id, user_id, status, created_at, profiles(first_name, last_name)')
      .eq('org_id', orgId),
    supabase
      .from('seat_events')
      .select('id, org_id, seat_id, action, reason, delta, stripe_item_id, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('seats')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'active'),
    supabase
      .from('phone_numbers')
      .select('id, org_id, seat_id, phone_number, sid, status, capabilities')
      .eq('org_id', orgId)
  ]);

  if (seatError) {
    throw seatError;
  }

  if (eventError) {
    throw eventError;
  }

  if (phoneError) {
    throw phoneError;
  }

  const seatList: (SupabaseSeatRow & { profiles?: { first_name?: string | null; last_name?: string | null } | null })[] =
    seatRows?.map((seat) => {
      const profileData = (seat as any).profiles;
      const profile = Array.isArray(profileData) ? profileData[0] : profileData;
      return { ...seat, profiles: profile ?? null };
    }) ?? [];
  const eventList: SupabaseSeatEventRow[] = seatEvents ?? [];
  const assignedSeats = assignedCountResult.count ?? 0;

  const includedSeats = organization.included_seats ?? 0;
  const seatDeltaFromEvents = eventList.reduce((sum, event) => sum + (event.delta ?? 0), 0);
  const activeSeatCount = seatList.filter((seat) => seat.status === 'active').length;
  const extraSeatCountFromSeats = activeSeatCount > includedSeats ? activeSeatCount - includedSeats : 0;
  const extraSeatsPurchased = extraSeatCountFromSeats || Math.max(0, seatDeltaFromEvents);
  const capacity = includedSeats + extraSeatsPurchased;
  const availableSeats = Math.max(0, capacity - assignedSeats);
  const extraSeatsUsed = Math.max(0, assignedSeats - includedSeats);

  const planCode = organization.plan_code;
  let planPriceCents = organization.plan_price_cents ?? null;

  let nextPlan: Pick<PlanCatalogRow, 'plan_code' | 'name' | 'included_seats' | 'base_price_cents'> | null = null;
  let extraSeatUnitPriceCents: number | null = null;
  let extraSeatAddonCode: string | null = null;
  let extraSeatAddonPriceId: string | null = null;

  const { data: plans, error: plansError } = await supabase
    .from('plan_catalog')
    .select('plan_code, name, included_seats, base_price_cents')
    .eq('active', true)
    .order('included_seats', { ascending: true });

  if (plansError) {
    throw plansError;
  }

  if (plans && plans.length > 0) {
    const currentPlan = planCode ? plans.find((plan) => plan.plan_code === planCode) : null;
    if (currentPlan) {
      planPriceCents = planPriceCents ?? currentPlan.base_price_cents;
      const addonCode = process.env.NODE_ENV === 'production' ? 'extra_seat' : 'extra_seat_test';
      const { data: addonRow } = await supabase
        .from('addon_catalog')
        .select('addon_code, price_cents, stripe_price_id')
        .eq('addon_code', addonCode)
        .single();

      extraSeatUnitPriceCents = addonRow?.price_cents ?? null;
      extraSeatAddonCode = addonRow?.addon_code ?? null;
      extraSeatAddonPriceId = addonRow?.stripe_price_id ?? null;
    }

    nextPlan = plans.find((plan) => plan.included_seats > includedSeats) || null;
  }

  if (extraSeatUnitPriceCents === null) {
    extraSeatUnitPriceCents = calculateExtraSeatUnitPrice(planPriceCents, includedSeats);
  }

  const extraSeatMonthlyCostCents = extraSeatUnitPriceCents !== null ? extraSeatsPurchased * extraSeatUnitPriceCents : null;

  const limitBeforeUpgrade = nextPlan ? nextPlan.included_seats : null;
  const maxExtraSeatsBeforeUpgrade = nextPlan ? Math.max(0, nextPlan.included_seats - includedSeats - 1) : null;
  const extraSeatsRemainingBeforeUpgrade =
    maxExtraSeatsBeforeUpgrade !== null ? Math.max(0, maxExtraSeatsBeforeUpgrade - extraSeatsPurchased) : null;
  const reachedUpgradeThreshold = limitBeforeUpgrade !== null ? capacity >= limitBeforeUpgrade : false;

  let upgradeMessage: string | null = null;
  if (nextPlan) {
    if (reachedUpgradeThreshold) {
      upgradeMessage = `Upgrade to the ${nextPlan.name} plan for ${nextPlan.included_seats} included seats.`;
    } else if (extraSeatsRemainingBeforeUpgrade !== null) {
      upgradeMessage = `You can add ${extraSeatsRemainingBeforeUpgrade} more seat${extraSeatsRemainingBeforeUpgrade === 1 ? '' : 's'} before needing to upgrade to the ${nextPlan.name} plan.`;
    }
  }

  return {
    includedSeats,
    extraSeatsPurchased,
    capacity,
    assignedSeats,
    availableSeats,
    extraSeatsUsed,
    extraSeatUnitPriceCents,
    extraSeatMonthlyCostCents,
    planCode: planCode ?? null,
    planPriceCents,
    nextPlan,
    limitBeforeUpgrade,
    maxExtraSeatsBeforeUpgrade,
    extraSeatsRemainingBeforeUpgrade,
    reachedUpgradeThreshold,
    upgradeMessage,
    extraSeatAvailable: availableSeats > 0,
    extraSeatAddonCode,
    extraSeatAddonPriceId,
	stripeSubscriptionId: organization.stripe_subscription_id ?? null,
	twilioSubaccountSid: organization.twilio_subaccount_sid ?? null,
	twilioMessagingServiceSid: organization.twilio_messaging_service_sid ?? null,
    seatEvents: eventList,
    seats: seatList.map((s) => ({
      ...s,
      profile: s.profiles ?? null
    })),
    phoneNumbers: (phoneNumbers ?? []).map((phone) => ({
      ...phone,
      capabilities: (phone.capabilities ?? {}) as Record<string, unknown>
    }))
  };
}

export async function updateOrgMaxSeats(orgId: string, newCapacity: number) {
  await supabase
    .from('organizations')
    .update({ max_seats: newCapacity })
    .eq('id', orgId);
}

export async function syncExtraSeatAddon(params: {
  orgId: string;
  stripeSubscriptionId: string;
  addonPriceId: string;
  quantity: number;
}) {
  const { orgId, stripeSubscriptionId, addonPriceId, quantity } = params;
  const stripe = getStripeClient();

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ['items.data.price']
  });

  const existing = subscription.items.data.find((item) => item.price?.id === addonPriceId);

  if (existing) {
    if (quantity <= 0) {
      await stripe.subscriptionItems.update(existing.id, {
        quantity: 0,
        proration_behavior: 'create_prorations'
      });
      await stripe.subscriptionItems.del(existing.id, {
        proration_behavior: 'create_prorations'
      });
    } else {
      await stripe.subscriptionItems.update(existing.id, {
        quantity,
        proration_behavior: 'create_prorations'
      });
    }
  } else {
    if (quantity > 0) {
      await stripe.subscriptionItems.create({
        subscription: stripeSubscriptionId,
        price: addonPriceId,
        quantity,
        proration_behavior: 'create_prorations'
      });
    }
  }

  await supabase
    .from('organizations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', orgId);
}

export async function recordSeatEvent(params: {
  orgId: string;
  seatId?: string | null;
  action: string;
  delta: number;
  reason?: string | null;
  stripeItemId?: string | null;
}) {
  const { orgId, seatId = null, action, delta, reason = null, stripeItemId = null } = params;

  await supabase.from('seat_events').insert({
    org_id: orgId,
    seat_id: seatId,
    action,
    delta,
    reason,
    stripe_item_id: stripeItemId
  });
}

export async function getSeatCapacity(orgId: string) {
  const summary = await loadSeatSummary(orgId);
  return {
    capacity: summary.capacity,
    assignedSeats: summary.assignedSeats,
    includedSeats: summary.includedSeats,
    extraSeatsPurchased: summary.extraSeatsPurchased
  };
}

export async function deactivateExtraSeats(params: { orgId: string; includedSeats: number }) {
  const { orgId, includedSeats } = params;

  const { data: seatRows, error } = await supabase
    .from('seats')
    .select('id, user_id, status, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const seats = seatRows ?? [];
  const activeSeats = seats.filter((seat) => seat.status === 'active');

  if (activeSeats.length <= includedSeats) {
    return;
  }

  const seatsToKeep: string[] = [];

  const assignedActive = activeSeats.filter((seat) => seat.user_id !== null);
  for (const seat of assignedActive) {
    if (seatsToKeep.length < includedSeats) {
      seatsToKeep.push(seat.id);
    }
  }

  if (seatsToKeep.length < includedSeats) {
    for (const seat of activeSeats) {
      if (!seatsToKeep.includes(seat.id)) {
        seatsToKeep.push(seat.id);
      }
      if (seatsToKeep.length >= includedSeats) {
        break;
      }
    }
  }

  const seatsToDeactivate = activeSeats
    .filter((seat) => !seatsToKeep.includes(seat.id))
    .map((seat) => seat.id);

  if (seatsToDeactivate.length === 0) {
    return;
  }

  await supabase
    .from('seats')
    .update({ status: 'inactive', user_id: null })
    .in('id', seatsToDeactivate);
}

export async function computeMaxSeatsForPlan(
  planCode: string | null,
  includedSeats: number | null
): Promise<number | null> {
  const normalizedIncluded = includedSeats ?? 0;

  const { data: plans, error } = await supabase
    .from('plan_catalog')
    .select('plan_code, included_seats')
    .eq('active', true)
    .order('included_seats', { ascending: true });

  if (error) {
    console.warn('[seats] Failed to load plan catalog for max seats', error);
    return normalizedIncluded > 0 ? normalizedIncluded : null;
  }

  const planList = plans ?? [];

  if (planList.length === 0) {
    return normalizedIncluded > 0 ? normalizedIncluded : null;
  }

  const currentPlan = planCode ? planList.find((plan) => plan.plan_code === planCode) : null;
  const currentIncluded = currentPlan?.included_seats ?? normalizedIncluded;

  const nextPlan = planList.find((plan) => plan.included_seats > currentIncluded);

  if (!nextPlan) {
    return null;
  }

  const candidate = Math.max(currentIncluded, nextPlan.included_seats - 1);
  return candidate > 0 ? candidate : null;
}

