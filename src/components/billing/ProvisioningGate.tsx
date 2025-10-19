import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { toast } from 'sonner';
import { fetchPhoneNumbers } from '../../api/phone';
import { supabase } from '../../utils/supabaseClient';
import { apiPost } from '../../utils/api';

interface ProvisioningGateProps {
  organizationId: string;
  includedSeats: number;
  onComplete: () => Promise<void> | void;
}

export const ProvisioningGate: React.FC<ProvisioningGateProps> = ({ organizationId, includedSeats, onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [autoRunning, setAutoRunning] = useState(false);
  // Track background ensure state
  const [error, setError] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState('');
  const [numbersCount, setNumbersCount] = useState(0);

  const needsNumbers = useMemo(() => {
    const neededSeats = Number.isFinite(includedSeats) ? Math.max(includedSeats, 0) : 0;
    return numbersCount < neededSeats;
  }, [numbersCount, includedSeats]);

  const refreshNumbers = useCallback(async () => {
    try {
      const resp = await fetchPhoneNumbers(organizationId);
      setNumbersCount((resp?.numbers || []).length);
    } catch {
      setNumbersCount(0);
    }
  }, [organizationId]);

  const tryAutoProvision = useCallback(async () => {
    setAutoRunning(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const resp = await apiPost('/api/billing/orgs/provision', {
        orgId: organizationId,
        readOnly: true,
      });
      if (resp.status === 409) {
        throw new Error('Payment not confirmed yet. Please wait and try again.');
      }
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Provisioning failed');
      }
      await refreshNumbers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Provisioning failed');
    } finally {
      setAutoRunning(false);
    }
  }, [organizationId, refreshNumbers]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Ensure Twilio core resources (subaccount/app/messaging service) without buying numbers
      await tryAutoProvision();
      await refreshNumbers();
      setLoading(false);
    })();
  }, [refreshNumbers, tryAutoProvision]);

  // If already satisfied, complete immediately (skip gate on refreshes)
  useEffect(() => {
    if (!loading && !needsNumbers) {
      (async () => { try { await onComplete(); } catch { /* no-op */ } })();
    }
  }, [loading, needsNumbers, onComplete]);

  // Removed automatic number provisioning: user must submit an area code to purchase numbers

  const onProvisionWithAreaCode = useCallback(async () => {
    if (!areaCode || areaCode.length !== 3) {
      setError('Please enter a valid 3-digit area code');
      return;
    }
    setAutoRunning(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const resp = await apiPost('/api/billing/orgs/provision', {
        orgId: organizationId,
        areaCode,
      });
      if (resp.status === 409) throw new Error('Payment not confirmed yet. Please wait and try again.');
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Provisioning failed');
      }
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok || body?.error) {
        throw new Error(body?.error || 'Provisioning failed');
      }
      toast.success('Phone system provisioned');
      await refreshNumbers();
      if (!needsNumbers) {
        await onComplete();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Provisioning failed');
    } finally {
      setAutoRunning(false);
    }
  }, [areaCode, organizationId, onComplete, needsNumbers, refreshNumbers]);

  const onContinue = useCallback(async () => {
    await onComplete();
  }, [onComplete]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">Let’s set up your phone system</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">We’ll provision {Math.max(includedSeats, 0)} phone number{includedSeats === 1 ? '' : 's'} for your team — on the house.</p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-gray-200 p-4 text-sm dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span>Phone numbers provisioned</span>
                <span className="font-medium">{numbersCount} / {Math.max(includedSeats, 0)}</span>
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">{error}</div>
            ) : null}

            {needsNumbers ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-700 dark:text-gray-300">Prefer a specific region? Pick an area code and we’ll get your numbers there.</div>
                <div>
                  <Label htmlFor="gate-area">Area Code</Label>
                  <Input
                    id="gate-area"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                    placeholder="e.g. 415"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button onClick={onProvisionWithAreaCode} disabled={autoRunning || !areaCode || areaCode.length !== 3}>
                    {autoRunning ? 'Provisioning…' : `Get ${Math.max(includedSeats - numbersCount, 0)} Number${(includedSeats - numbersCount) === 1 ? '' : 's'}`}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button onClick={onContinue}>Continue</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvisioningGate;


