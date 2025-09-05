import React, { useState, useEffect } from 'react';
import { Calculator, Phone, MessageSquare, Image, DollarSign } from 'lucide-react';

interface PricingData {
  service_type: string;
  country_code: string;
  pricing_type: string;
  cost_per_unit: number;
  markup_percentage: number;
}

interface OrganizedPricing {
  sms: PricingData[];
  mms: PricingData[];
  voice: PricingData[];
}

const PricingCalculator: React.FC = () => {
  const [pricing, setPricing] = useState<OrganizedPricing | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceType, setServiceType] = useState<'sms' | 'mms' | 'voice'>('sms');
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [units, setUnits] = useState(1);
  const [calculatedCost, setCalculatedCost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/billing/pricing');
      if (response.ok) {
        const data = await response.json();
        setPricing(data.organized);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const calculateCost = async () => {
    if (!phoneNumber || !serviceType || !direction || !units) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/billing/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          serviceType,
          direction,
          units
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCalculatedCost(data);
      }
    } catch (error) {
      console.error('Error calculating cost:', error);
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

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'sms': return 'SMS';
      case 'mms': return 'MMS';
      case 'mms_tollfree': return 'MMS (Toll-free)';
      case 'voice_local': return 'Voice (Local)';
      case 'voice_tollfree': return 'Voice (Toll-free)';
      case 'voice_sip': return 'Voice (SIP)';
      case 'voice_app_connect': return 'Voice (App Connect)';
      default: return type;
    }
  };

  const getServiceIcon = (type: string) => {
    if (type.startsWith('voice')) {
      return <Phone className="h-4 w-4" />;
    } else if (type.startsWith('mms')) {
      return <Image className="h-4 w-4" />;
    } else {
      return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pricing Calculator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Calculator className="h-5 w-5 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pricing Calculator</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Service Type
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as 'sms' | 'mms' | 'voice')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="sms">SMS</option>
              <option value="mms">MMS</option>
              <option value="voice">Voice</option>
            </select>
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
          disabled={isLoading || !phoneNumber}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isLoading ? 'Calculating...' : 'Calculate Cost'}
        </button>
        
        {calculatedCost && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Cost Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Service Type:</span>
                <span className="font-medium">{getServiceTypeLabel(calculatedCost.serviceType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Twilio Cost:</span>
                <span className="font-medium">{formatCurrency(calculatedCost.costs.twilio_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Markup ({calculatedCost.costs.markup_percentage}%):</span>
                <span className="font-medium">{formatCurrency(calculatedCost.costs.markup_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="text-gray-900 dark:text-white font-semibold">Total Cost:</span>
                <span className="text-red-600 dark:text-red-400 font-bold text-lg">
                  {formatCurrency(calculatedCost.costs.total_cost)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Pricing Table */}
      {pricing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Twilio Pricing</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Base costs before markup</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Inbound
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Outbound
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {/* SMS Pricing */}
                {pricing.sms.map((item, index) => (
                  <tr key={`sms-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">SMS</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getServiceTypeLabel(item.service_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.pricing_type === 'inbound' ? formatCurrency(item.cost_per_unit) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.pricing_type === 'outbound' ? formatCurrency(item.cost_per_unit) : '-'}
                    </td>
                  </tr>
                ))}
                
                {/* MMS Pricing */}
                {pricing.mms.map((item, index) => (
                  <tr key={`mms-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Image className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">MMS</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getServiceTypeLabel(item.service_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.pricing_type === 'inbound' ? formatCurrency(item.cost_per_unit) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.pricing_type === 'outbound' ? formatCurrency(item.cost_per_unit) : '-'}
                    </td>
                  </tr>
                ))}
                
                {/* Voice Pricing */}
                {pricing.voice.map((item, index) => (
                  <tr key={`voice-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Voice</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getServiceTypeLabel(item.service_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.pricing_type === 'inbound' ? formatCurrency(item.cost_per_unit) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.pricing_type === 'outbound' ? formatCurrency(item.cost_per_unit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingCalculator;
