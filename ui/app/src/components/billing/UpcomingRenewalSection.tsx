import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Receipt } from 'lucide-react';
import { api } from '../../utils/api';
import { supabase } from '../../utils/supabaseClient';
import type { OrganizationRow } from '../../types/billing';

type UpcomingLine = {
	id: string;
	description: string;
	amount: number;
	quantity: number;
	period: { start: number; end: number } | null;
};

type UpcomingPayload = {
	billed_at: number | null;
	next_payment_attempt: number | null;
	period_end: number | null;
	amount_due: number;
	total: number;
	currency: string;
	lines: UpcomingLine[];
};

function formatDateFromUnixOrIso(tsOrIso: number | string | null | undefined): string | null {
	if (tsOrIso == null) return null;
	const d = typeof tsOrIso === 'number' ? new Date(tsOrIso * 1000) : new Date(tsOrIso);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPeriodRange(start: number, end: number) {
	const a = new Date(start * 1000);
	const b = new Date(end * 1000);
	const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
	return `${a.toLocaleDateString('en-US', opts)} – ${b.toLocaleDateString('en-US', opts)}`;
}

function formatMoney(cents: number, currency: string) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase()
	}).format(cents / 100);
}

export function UpcomingRenewalSection({
	organization,
	orgLoading
}: {
	organization: OrganizationRow | null;
	orgLoading: boolean;
}) {
	const [preview, setPreview] = useState<UpcomingPayload | null>(null);
	const [fetchDone, setFetchDone] = useState(false);

	useEffect(() => {
		if (!organization?.stripe_customer_id) {
			setPreview(null);
			setFetchDone(true);
			return;
		}
		const status = organization.stripe_status;
		if (status === 'canceled' || status === 'incomplete_expired') {
			setPreview(null);
			setFetchDone(true);
			return;
		}

		setFetchDone(false);
		let cancelled = false;

		(async () => {
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				if (!session?.access_token) {
					if (!cancelled) {
						setPreview(null);
						setFetchDone(true);
					}
					return;
				}
				const q = new URLSearchParams({ customerId: organization.stripe_customer_id! });
				if (organization.stripe_subscription_id) {
					q.set('subscriptionId', organization.stripe_subscription_id);
				}
				const res = await api.get(`/api/billing/upcoming-invoice?${q}`, {
					headers: { Authorization: `Bearer ${session.access_token}` }
				});
				if (!res.ok) throw new Error('upcoming_failed');
				const data = await res.json();
				if (!cancelled) {
					setPreview(data.upcoming ?? null);
				}
			} catch {
				if (!cancelled) setPreview(null);
			} finally {
				if (!cancelled) setFetchDone(true);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		organization?.stripe_customer_id,
		organization?.stripe_subscription_id,
		organization?.stripe_status
	]);

	if (orgLoading || !organization) return null;
	if (!organization.stripe_customer_id) return null;
	if (
		organization.stripe_status === 'canceled' ||
		organization.stripe_status === 'incomplete_expired'
	) {
		return null;
	}

	const cancelAtEnd = organization.stripe_cancel_at_period_end;
	const periodEndIso = organization.current_period_end;
	const fallbackRenewal = formatDateFromUnixOrIso(periodEndIso);

	const rawForDate =
		preview != null
			? (preview.next_payment_attempt ?? preview.billed_at ?? preview.period_end)
			: null;
	let billedDate = formatDateFromUnixOrIso(rawForDate);
	if (!billedDate && preview?.lines?.[0]?.period) {
		billedDate = formatDateFromUnixOrIso(preview.lines[0].period.end);
	}

	if (!fetchDone) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Receipt className="h-5 w-5" />
						Upcoming invoice
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex justify-center py-8">
						<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (cancelAtEnd && (fallbackRenewal || billedDate)) {
		const endDate = fallbackRenewal ?? billedDate;
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Receipt className="h-5 w-5" />
						Subscription end date
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
					<p>
						Your subscription is set to end on{' '}
						<strong className="text-gray-900 dark:text-white">{endDate}</strong>. You won’t be
						charged again after this date.
					</p>
				</CardContent>
			</Card>
		);
	}

	if (preview && preview.lines.length > 0) {
		const currency = preview.currency ?? 'usd';
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Receipt className="h-5 w-5" />
						Upcoming invoice
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Your next invoice will be billed on
						{billedDate ? (
							<>
								{' '}
								on{' '}
								<strong className="text-gray-900 underline decoration-dotted dark:text-white">
									{billedDate}
								</strong>
							</>
						) : null}
						. It may change if the subscription is updated.
					</p>
					{/* <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
						<table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
							<thead className="bg-gray-50 dark:bg-gray-800">
								<tr>
									<th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
										Description
									</th>
									<th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
										Qty
									</th>
									<th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
										Unit price
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
								{preview.lines.map((line) => {
									const qty = line.quantity && line.quantity > 0 ? line.quantity : 1;
									const unit = Math.round(line.amount / qty);
									return (
										<tr key={line.id}>
											<td className="px-4 py-3 text-gray-900 dark:text-white">
												<div className="font-medium">{line.description}</div>
												{line.period && (
													<div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
														{formatPeriodRange(line.period.start, line.period.end)}
													</div>
												)}
											</td>
											<td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
												{qty}
											</td>
											<td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
												{formatMoney(unit, currency)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
					<p className="text-sm font-medium text-gray-900 dark:text-white">
						Total due: {formatMoney(preview.amount_due ?? preview.total ?? 0, currency)}
					</p> */}
				</CardContent>
			</Card>
		);
	}

	if (fallbackRenewal) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Receipt className="h-5 w-5" />
						Renewal & billing
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
					<p>
						Your subscription renews on{' '}
						<strong className="text-gray-900 dark:text-white">{fallbackRenewal}</strong> when the
						current billing period ends (automatic renewal unless you cancel).
					</p>
				</CardContent>
			</Card>
		);
	}

	return null;
}
