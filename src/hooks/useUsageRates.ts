import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { fetchUsageCatalogPricing } from '../api/billing';

interface UsageRate {
  key: 'voice' | 'sms';
  label: string;
  rate: number;
  unitLabel: string;
  color: string;
  stripePriceId: string | null;
}

export function useUsageRates(): UsageRate[] | null {
  const { session } = useAuth();
  const [rates, setRates] = useState<UsageRate[] | null>(null);

  console.log("herer", rates);

  useEffect(() => {
    if (!session?.access_token) {
      setRates(null);
      return;
    }

    let cancelled = false;

    fetchUsageCatalogPricing(session.access_token)
      .then((data) => {
        if (cancelled) return;
        const voiceRate = data.voice ? data.voice.amountCents / 100 : null;
        const smsRate = data.sms ? data.sms.amountCents / 100 : null;

        console.log("ere", data, data.voice, data.sms);

        setRates([
          {
            key: 'voice',
            label: 'Voice minutes',
            rate: voiceRate ?? 0,
            unitLabel: 'mins',
            color: 'bg-rose-500',
            stripePriceId: data.voice?.stripe_price_id ?? null
          },
          {
            key: 'sms',
            label: 'SMS messages',
            rate: smsRate ?? 0,
            unitLabel: 'SMS',
            color: 'bg-blue-500',
            stripePriceId: data.sms?.stripe_price_id ?? null
          }
        ]);
      })
      .catch((error) => {
        console.warn('Failed to load usage rates', error);
        console.log("error", error);
        if (!cancelled) {
          setRates([
            {
              key: 'voice',
              label: 'Voice minutes',
              rate: 0,
              unitLabel: 'mins',
              color: 'bg-rose-500',
              stripePriceId: null
            },
            {
              key: 'sms',
              label: 'SMS messages',
              rate: 0,
              unitLabel: 'SMS',
              color: 'bg-blue-500',
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
