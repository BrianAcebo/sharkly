import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { isOrganizationBehindOnPayments, getOrganizationStatusMessage } from '../../utils/paymentStatus';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

interface PaymentRequiredBlockProps {
  children: React.ReactNode;
  organization?: any; // OrganizationRow type
  onUpdatePayment?: () => void;
  showBanner?: boolean;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentRequiredBlock({ 
  children, 
  organization, 
  onUpdatePayment,
  showBanner = true 
}: PaymentRequiredBlockProps) {
  const { paymentStatus, isLoading } = usePaymentStatus();
  
  // Use provided organization or payment status organization
  const org = organization || paymentStatus?.organization;
  
  if (isLoading || !org) {
    return <>{children}</>;
  }

  const isBehindOnPayments = isOrganizationBehindOnPayments(org);
  const statusMessage = getOrganizationStatusMessage(org);

  if (!isBehindOnPayments) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Payment Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              {statusMessage}
            </p>
            {org.payment_failure_reason && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Reason: {org.payment_failure_reason}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <TopupSheet />
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
              Once deposit is successful, access will be restored automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TopupSheet() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="w-full"
        size="lg"
      >
        <CreditCard className="h-4 w-4 mr-2" />
        Deposit Funds
      </Button>
      {open ? (
        <Elements stripe={stripePromise!}>
          <TopupModal onClose={() => setOpen(false)} />
        </Elements>
      ) : null}
    </>
  );
}

function TopupModal({ onClose }: { onClose: () => void }) {
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
