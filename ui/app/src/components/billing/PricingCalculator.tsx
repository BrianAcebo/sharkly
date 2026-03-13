import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { useOrganization } from '../../hooks/useOrganization';
import { useUsageRates } from '../../hooks/useUsageRates';

interface CreditsCostBreakdown {
  enteredCredits: number;
  includedCredits: number;
  billableCredits: number;
  unitPrice: number; // USD per credit
  total: number;
}

const PricingCalculator: React.FC = () => {
  const { organization } = useOrganization();
  const usageRates = useUsageRates();
  const [credits, setCredits] = useState(1);
  const [calculatedCost, setCalculatedCost] = useState<CreditsCostBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculateCost = async () => {
    if (!credits) return;
    setIsLoading(true);
    try {
      const ceilUnits = Math.ceil(credits);
      const rate = (usageRates?.find((r) => r.key === 'credits')?.rate ?? 0); // USD per credit
      const included = organization?.included_credits || 0;
      const billable = Math.max(0, ceilUnits - included);
      setCalculatedCost({
        enteredCredits: ceilUnits,
        includedCredits: included,
        billableCredits: billable,
        unitPrice: rate,
        total: billable * rate
      });
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
              Credits
            </label>
            <input
              type="number"
              min="1"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value) || 1)}
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
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Entered Credits:</span>
                <span className="font-medium">{calculatedCost.enteredCredits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Included Credits:</span>
                <span className="font-medium">{calculatedCost.includedCredits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Billable Credits:</span>
                <span className="font-medium">{calculatedCost.billableCredits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rate (per credit):</span>
                <span className="font-medium">{formatCurrency(calculatedCost.unitPrice)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="text-gray-900 dark:text-white font-semibold">Estimated Cost:</span>
                <span className="text-red-600 dark:text-red-400 font-bold text-lg">
                  {formatCurrency(calculatedCost.total)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingCalculator;
