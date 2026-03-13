import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { fetchUsageCatalogPricing } from '../api/billing';

interface UsageRate {
  key: 'credits';
  label: string;
  rate: number;
  unitLabel: string;
  color: string;
  stripePriceId: string | null;
}

export function useUsageRates(): UsageRate[] | null {
  const { session } = useAuth();
  const [rates, setRates] = useState<UsageRate[] | null>(null);

  useEffect(() => {
    if (!session?.access_token) {
      setRates(null);
      return;
    }

    let cancelled = false;

    fetchUsageCatalogPricing(session.access_token)
      .then((data) => {
        if (cancelled) return;
        const creditsRate = data.credits && data.credits.amountCents != null ? data.credits.amountCents / 100 : 0;

        setRates([
          {
            key: 'credits',
            label: 'LLM credits',
            rate: creditsRate,
            unitLabel: 'credits',
            color: 'bg-rose-500',
            stripePriceId: data.credits?.stripe_price_id ?? null
          }
        ]);
      })
      .catch((error) => {
        console.warn('Failed to load usage rates', error);
        console.log("error", error);
        if (!cancelled) {
          setRates([
            {
              key: 'credits',
              label: 'LLM credits',
              rate: 0,
              unitLabel: 'credits',
              color: 'bg-rose-500',
              stripePriceId: null
            }
          ]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  return rates;
}
