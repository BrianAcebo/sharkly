import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { formatPhoneNumber } from '../../utils/format';
import { assignPhoneNumber, fetchPhoneNumbers, purchasePhoneNumber, releasePhoneNumber } from '../../api/phone';
import type { PhoneNumberRecord } from '../../types/phone';
import type { SeatSummary } from '../../types/organization';
import { supabase } from '../../utils/supabaseClient';
import { api } from '../../utils/api';

type SeatAssignmentRecord = SeatSummary['seats'][number];
type PhoneNumberListResponse = { numbers: Array<{ phone_number: string; status: string }> };

interface PhoneSmsState {
	isLoading: boolean;
	numbers: PhoneNumberRecord[];
	seatSummary: SeatSummary | null;
}

interface PurchaseFormState {
	mode: 'local' | 'tollFree';
	areaCode: string;
	voiceEnabled: boolean;
	smsEnabled: boolean;
}

export default function PhoneSmsPage() {
	const { organizationId } = useParams<{ organizationId: string }>();
	const [state, setState] = useState<PhoneSmsState>({
		isLoading: true,
		numbers: [],
		seatSummary: null,
	});
	const [isPurchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
	const [isAssignDialogOpen, setAssignDialogOpen] = useState(false);
	const [isReleaseDialogOpen, setReleaseDialogOpen] = useState(false);
	const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>({
		mode: 'local',
		areaCode: '',
		voiceEnabled: true,
		smsEnabled: true
	});
	const [selectedNumber, setSelectedNumber] = useState<PhoneNumberRecord | null>(null);
	const [selectedSeatId, setSelectedSeatId] = useState<string>('');
	const [isActionLoading, setActionLoading] = useState(false);

	const assignedCounts = useMemo(() => {
		const assignments = new Set(state.numbers.filter((n) => n.status === 'assigned' && n.seat_id).map((n) => n.seat_id as string));
		return assignments.size;
	}, [state.numbers]);

	const fetchSeatSummary = async (orgId: string): Promise<SeatSummary | null> => {
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (!session?.access_token) {
				toast.error('Not authenticated');
				return null;
			}

      const response = await api.get(`/api/organizations/${orgId}/seats`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				toast.error(err?.error || 'Failed to load seat summary');
				return null;
			}

			const data = (await response.json()) as { summary: SeatSummary };
			return data.summary;
		} catch (error) {
			console.error('Error fetching seat summary for Phone & SMS page:', error);
			toast.error('Failed to load seat summary');
			return null;
		}
	};

	const loadData = async () => {
		if (!organizationId) return;
		setState((prev) => ({ ...prev, isLoading: true }));
		try {
      const [numbersResp, seatSummaryData] = await Promise.all([
        api.get(`/api/twilio/phone/organizations/${organizationId}/phone-numbers`),
        fetchSeatSummary(organizationId)
      ]);

      const numbersData: PhoneNumberListResponse = await numbersResp.json();
      setState({
        isLoading: false,
        numbers: (numbersData as any)?.numbers ?? [],
        seatSummary: seatSummaryData
      });
		} catch (error) {
			console.error('Error loading phone & SMS data', error);
			toast.error('Failed to load phone numbers. Please try again later.');
			setState((prev) => ({ ...prev, isLoading: false }));
		}
	};

	useEffect(() => {
		loadData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [organizationId]);

	const availableSeats = useMemo(() => {
		if (!state.seatSummary) return [];
		return state.seatSummary.seats.filter((seat) => seat.status === 'active');
	}, [state.seatSummary]);

	const handlePurchaseClick = () => {
		setPurchaseDialogOpen(true);
	};

	const handleAssignClick = (number: PhoneNumberRecord) => {
		setSelectedNumber(number);
		setSelectedSeatId(number.seat_id ?? '');
		setAssignDialogOpen(true);
	};

	const handleReleaseClick = (number: PhoneNumberRecord) => {
		setSelectedNumber(number);
		setReleaseDialogOpen(true);
	};

	const resetDialogs = () => {
		setPurchaseDialogOpen(false);
		setAssignDialogOpen(false);
		setReleaseDialogOpen(false);
		setSelectedNumber(null);
		setSelectedSeatId('');
		setActionLoading(false);
	};

	const confirmPurchase = async () => {
		if (!organizationId) return;
		setActionLoading(true);
		try {
			const { mode, areaCode, voiceEnabled, smsEnabled } = purchaseForm;
			await purchasePhoneNumber(organizationId, {
				areaCode: mode === 'local' ? areaCode.trim() || undefined : undefined,
				tollFree: mode === 'tollFree',
				capabilities: {
					voice: voiceEnabled,
					sms: smsEnabled
				}
			});
			toast.success('Phone number purchased successfully');
			resetDialogs();
			await loadData();
		} catch (error) {
			console.error('Error purchasing phone number', error);
			toast.error(error instanceof Error ? error.message : 'Failed to purchase phone number');
			setActionLoading(false);
		}
	};

	const confirmAssign = async () => {
		if (!organizationId || !selectedNumber || !selectedSeatId) {
			toast.error('Select a seat to assign this number.');
			return;
		}
		setActionLoading(true);
		try {
			await assignPhoneNumber(organizationId, selectedNumber.id, {
				seatId: selectedSeatId
			});
			toast.success('Phone number assigned successfully');
			resetDialogs();
			await loadData();
		} catch (error) {
			console.error('Error assigning phone number', error);
			toast.error(error instanceof Error ? error.message : 'Failed to assign phone number');
			setActionLoading(false);
		}
	};

	const confirmRelease = async () => {
		if (!organizationId || !selectedNumber) return;
		setActionLoading(true);
		try {
			await releasePhoneNumber(organizationId, selectedNumber.id);
			toast.success('Phone number released successfully');
			resetDialogs();
			await loadData();
		} catch (error) {
			console.error('Error releasing phone number', error);
			toast.error(error instanceof Error ? error.message : 'Failed to release phone number');
			setActionLoading(false);
		}
	};

	const renderNumbersTable = () => {
		if (state.isLoading) {
			return (
				<div className="space-y-3">
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton key={index} className="h-12 w-full" />
					))}
				</div>
			);
		}

		if (!state.numbers.length) {
			return <p className="text-sm text-muted-foreground">No phone numbers purchased yet.</p>;
		}

		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Number</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Seat</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{state.numbers.map((number) => (
						<TableRow key={number.id}>
							<TableCell>{formatPhoneNumber(number.phone_number) ?? number.phone_number}</TableCell>
							<TableCell className="capitalize">{number.status}</TableCell>
							<TableCell>
                {number.seat_id
                  ? (() => {
                      const seat = state.seatSummary?.seats.find((s) => s.id === number.seat_id);
                      const displayName =
                        seat?.profile?.first_name || seat?.profile?.last_name
                          ? [seat?.profile?.first_name, seat?.profile?.last_name]
                              .filter(Boolean)
                              .join(' ')
                          : seat?.profile?.email;
                      return displayName || seat?.id || number.seat_id;
                    })()
                  : 'Unassigned'}
							</TableCell>
							<TableCell className="flex justify-end gap-2">
								<Button size="sm" variant="outline" onClick={() => handleAssignClick(number)}>
									Assign
								</Button>
								<Button size="sm" variant="ghost" onClick={() => handleReleaseClick(number)}>
									Release
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Messaging Service</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm text-muted-foreground">
					<p>
						<strong>Subaccount SID:</strong> {state.seatSummary?.twilioSubaccountSid ?? 'Not provisioned'}
					</p>
					<p>
						<strong>Messaging Service SID:</strong>{' '}
						{state.seatSummary?.twilioMessagingServiceSid ?? 'Not provisioned'}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Phone Numbers</CardTitle>
				</CardHeader>
				<CardContent>{renderNumbersTable()}</CardContent>
				<CardFooter className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
					<div className="text-sm text-muted-foreground">
						<strong>{assignedCounts}</strong> numbers assigned to seats
					</div>
                    {/* Buying numbers moved to automated provisioning; button removed */}
				</CardFooter>
			</Card>

			<AlertDialog open={isPurchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Buy Phone Number</AlertDialogTitle>
					</AlertDialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Number Type</Label>
							<div className="flex gap-3">
								<Button
									type="button"
									variant={purchaseForm.mode === 'local' ? 'default' : 'outline'}
									onClick={() => setPurchaseForm((prev) => ({ ...prev, mode: 'local' }))}
								>
									Local
								</Button>
								<Button
									type="button"
									variant={purchaseForm.mode === 'tollFree' ? 'default' : 'outline'}
									onClick={() => setPurchaseForm((prev) => ({ ...prev, mode: 'tollFree', areaCode: '' }))}
								>
									Toll-Free
								</Button>
							</div>
						</div>

						{purchaseForm.mode === 'local' && (
							<div className="space-y-2">
								<Label htmlFor="areaCode">Area Code (optional)</Label>
								<Input
									id="areaCode"
									type="text"
									maxLength={3}
									value={purchaseForm.areaCode}
									onChange={(event) => {
										const value = event.target.value.replace(/[^0-9]/g, '').slice(0, 3);
										setPurchaseForm((prev) => ({ ...prev, areaCode: value }));
									}}
								/>
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="voiceEnabled"
									checked={purchaseForm.voiceEnabled}
									onChange={(event) => setPurchaseForm((prev) => ({ ...prev, voiceEnabled: event.target.checked }))}
								/>
								<Label htmlFor="voiceEnabled">Voice</Label>
							</div>
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="smsEnabled"
									checked={purchaseForm.smsEnabled}
									onChange={(event) => setPurchaseForm((prev) => ({ ...prev, smsEnabled: event.target.checked }))}
								/>
								<Label htmlFor="smsEnabled">SMS</Label>
							</div>
						</div>

						<p className="text-xs text-muted-foreground">
							We’ll automatically attach this number to your Messaging Service and configure SMS/voice webhooks.
						</p>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isActionLoading}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmPurchase} disabled={isActionLoading}>
							{isActionLoading ? 'Purchasing…' : 'Confirm Purchase'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={isAssignDialogOpen} onOpenChange={setAssignDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Assign Phone Number</AlertDialogTitle>
					</AlertDialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">Select a seat to assign {selectedNumber?.phone_number}.</p>
						<div className="space-y-2">
							<Label htmlFor="seatSelect">Seat</Label>
							<select
								id="seatSelect"
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								value={selectedSeatId}
								onChange={(event) => setSelectedSeatId(event.target.value)}
							>
								<option value="">Select a seat</option>
                  {availableSeats.map((seat) => {
                    const seatName =
                      seat.profile?.first_name || seat.profile?.last_name
                        ? [seat.profile?.first_name, seat.profile?.last_name].filter(Boolean).join(' ')
                        : seat.profile?.email;
                    return (
                      <option key={seat.id} value={seat.id}>
                        {seatName || seat.id}
                      </option>
                    );
                  })}
							</select>
						</div>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isActionLoading}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmAssign} disabled={isActionLoading || !selectedSeatId}>
							{isActionLoading ? 'Assigning…' : 'Assign Number'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={isReleaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Release Phone Number</AlertDialogTitle>
					</AlertDialogHeader>
					<p className="text-sm text-muted-foreground">
						This will release {selectedNumber?.phone_number} back to Twilio and remove any seat assignment.
					</p>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isActionLoading}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmRelease} disabled={isActionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							{isActionLoading ? 'Releasing…' : 'Release Number'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

