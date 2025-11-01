export interface SeatEvent {
	id: string;
	org_id: string;
	seat_id: string | null;
	action: string;
	reason: string | null;
	delta: number;
	stripe_item_id: string | null;
	created_at: string;
}

export interface SeatAssignment {
	id: string;
	org_id: string;
	user_id: string | null;
	status: string;
	created_at: string;
  profile?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
}

export interface SeatSummaryNextPlan {
	plan_code: string;
	name: string;
	included_seats: number;
	base_price_cents: number;
}

export interface SeatSummary {
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
	nextPlan: SeatSummaryNextPlan | null;
	limitBeforeUpgrade: number | null;
	maxExtraSeatsBeforeUpgrade: number | null;
	extraSeatsRemainingBeforeUpgrade: number | null;
	reachedUpgradeThreshold: boolean;
	upgradeMessage?: string | null;
	extraSeatAvailable: boolean;
	extraSeatAddonCode?: string | null;
	extraSeatAddonPriceId?: string | null;
	stripeSubscriptionId?: string | null;
	seatEvents: SeatEvent[];
	seats: SeatAssignment[];
}

export interface SeatSummaryResponse {
	summary: SeatSummary;
}

