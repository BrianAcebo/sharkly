import React, { useEffect, useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

export function WalletDepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Elements stripe={stripePromise!}>
      <InnerModal onClose={onClose} />
    </Elements>
  );
}

function InnerModal({ onClose }: { onClose: () => void }) {
  const { startTopup } = usePaymentStatus();
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { client_secret } = await startTopup();
        setClientSecret(client_secret);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start deposit');
      }
    })();
  }, [startTopup]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({ elements, clientSecret });
    setLoading(false);
    if (error) {
      setError(error.message || 'Payment failed');
    } else {
      onClose();
    }
  }, [stripe, elements, clientSecret, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 p-4 rounded-md w-full max-w-md">
        <h3 className="text-lg font-medium mb-3">Deposit Funds</h3>
        {error ? <div className="text-red-600 text-sm mb-2">{error}</div> : null}
        {clientSecret ? (
          <form onSubmit={onSubmit}>
            <PaymentElement />
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Pay'}</Button>
            </div>
          </form>
        ) : (
          <div>Preparing payment...</div>
        )}
      </div>
    </div>
  );
}


