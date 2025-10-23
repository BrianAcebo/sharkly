import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../utils/supabaseClient';
import { api } from '../../utils/api';

interface VoiceCostBreakdown {
  serviceType: 'voice';
  enteredMinutes: number;
  includedMinutes: number;
  billableMinutes: number;
  unitPrice: number;
  total: number;
}

const PricingCalculator: React.FC = () => {
  const { organization } = useOrganization();
  const [serviceType] = useState<'voice'>('voice');
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [units, setUnits] = useState(1);
  const [calculatedCost, setCalculatedCost] = useState<VoiceCostBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceUnitAmountCents, setVoiceUnitAmountCents] = useState<number | null>(null);

  useEffect(() => {
    // Load Stripe voice overage price for calculator math
    fetchVoicePrice();
  }, []);

  const fetchVoicePrice = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await api.get('/api/billing/voice-price', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined
      });
      if (response.ok) {
        const data = await response.json();
        const cents = (data?.stripe_price?.unit_amount as number | null) ?? null;
        setVoiceUnitAmountCents(cents);
      }
    } catch (error) {
      console.error('Error fetching voice price:', error);
    }
  };

  const calculateCost = async () => {
    if (!direction || !units) return;
    setIsLoading(true);
    try {
      const ceilUnits = Math.ceil(units);
      if (serviceType === 'voice') {
        const rate = (voiceUnitAmountCents ?? 0) / 100; // USD per minute
        const included = organization?.included_minutes || 0;
        const billable = Math.max(0, ceilUnits - included);
        setCalculatedCost({
          serviceType: 'voice',
          enteredMinutes: ceilUnits,
          includedMinutes: included,
          billableMinutes: billable,
          unitPrice: rate,
          total: billable * rate
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Pricing Calculator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Calculator className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pricing Calculator</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Service Type
            </label>
            <input
              value="Voice"
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Direction
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'inbound' | 'outbound')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {serviceType === 'voice' ? 'Minutes' : 'Messages'}
            </label>
            <input
              type="number"
              min="1"
              value={units}
              onChange={(e) => setUnits(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        <button
          onClick={calculateCost}
          disabled={isLoading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isLoading ? 'Calculating...' : 'Calculate Cost'}
        </button>
        
        {calculatedCost && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Cost Breakdown</h4>
            <div className="space-y-2 text-sm">
              {(
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Entered Minutes:</span>
                    <span className="font-medium">{calculatedCost.enteredMinutes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Included Minutes:</span>
                    <span className="font-medium">{calculatedCost.includedMinutes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Billable Minutes:</span>
                    <span className="font-medium">{calculatedCost.billableMinutes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Rate (per min):</span>
                    <span className="font-medium">{formatCurrency(calculatedCost.unitPrice)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span className="text-gray-900 dark:text-white font-semibold">Estimated Cost:</span>
                    <span className="text-red-600 dark:text-red-400 font-bold text-lg">
                      {formatCurrency(calculatedCost.total)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pricing table removed; legacy Twilio pricing is no longer present */}
    </div>
  );
};

export default PricingCalculator;
