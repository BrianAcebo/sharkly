import React, { useEffect, useState } from 'react';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useOrganization } from '../hooks/useOrganization';
import { useTrial } from '../hooks/useTrial';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';
import {
  DollarSign,
  MessageSquare,
  Phone,
  TrendingUp,
  Calendar,
  Settings,
  Download,
  AlertCircle,
  CreditCard,
  Clock,
  Users,
  Mail,
  ExternalLink
} from 'lucide-react';
import PricingCalculator from '../components/billing/PricingCalculator';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface UsageSummary {
  sms: {
    count: number;
    cost: number;
    records: any[];
  };
  voice: {
    minutes: number;
    cost: number;
    records: any[];
  };
  total: {
    cost: number;
    sms_cost: number;
    voice_cost: number;
  };
}

interface MonthlyBilling {
  id: string;
  billing_month: string;
  sms_count: number;
  sms_cost: number;
  voice_minutes: number;
  voice_cost: number;
  total_cost: number;
  status: string;
  invoice_number?: string;
  due_date?: string;
  paid_date?: string;
}

interface BillingSettings {
  default_markup_percentage: number;
  billing_cycle: string;
  auto_billing: boolean;
  billing_email?: string;
  payment_method?: string;
}

const Billing: React.FC = () => {
  const { setTitle } = useBreadcrumbs();
  const { organization, loading: orgLoading } = useOrganization();
  const trialInfo = useTrial();
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [monthlyBilling, setMonthlyBilling] = useState<MonthlyBilling[]>([]);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'pricing'>('overview');

  useEffect(() => {
    setTitle('Billing & Usage');
    fetchBillingData();
  }, [setTitle, selectedPeriod]);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      
      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!userOrg) {
        toast.error('No organization found');
        return;
      }

      const organizationId = userOrg.organization_id;

      // Calculate date range based on selected period
      const { startDate, endDate } = getDateRange(selectedPeriod);

      // Fetch usage summary
      const usageResponse = await fetch(
        `/api/billing/usage-summary/${organizationId}?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsageSummary(usageData.summary);
      }

      // Fetch monthly billing history
      const billingResponse = await fetch(`/api/billing/monthly-billing/${organizationId}`);
      
      if (billingResponse.ok) {
        const billingData = await billingResponse.json();
        setMonthlyBilling(billingData.billing_history);
      }

      // Fetch billing settings
      const settingsResponse = await fetch(`/api/billing/settings/${organizationId}`);
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setBillingSettings(settingsData.settings);
      }

    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to fetch billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRange = (period: string) => {
    const now = new Date();
    let startDate: string;
    let endDate: string;

    switch (period) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'last-month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'last-3-months':
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        startDate = threeMonthsAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
    }

    return { startDate, endDate };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Usage</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your Twilio usage and costs</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="current-month">Current Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
          </select>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'usage'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Usage & Billing
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pricing'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Pricing Calculator
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Plan & Subscription Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Plan Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Current Plan</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orgLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-red-500"></div>
                  </div>
                ) : organization ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {organization.plan_code ? 
                            organization.plan_code.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                            'No Plan'
                          }
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {organization.plan_price_cents ? 
                            `$${(organization.plan_price_cents / 100).toFixed(2)}/month` : 
                            'Free'
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          organization.stripe_status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : organization.stripe_status === 'trialing'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : organization.stripe_status === 'incomplete'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {organization.stripe_status || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Plan Features */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Included Features</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2 text-sm">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{organization.included_seats || 0} team members</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span>{organization.included_minutes || 0} calling minutes</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                          <span>{organization.included_sms || 0} SMS messages</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span>{organization.included_emails || 0} emails</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open('https://billing.stripe.com/p/login/test_fZu8wPeit9J33Yu4Kb2go00', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Manage Subscription
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No organization data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trial Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Trial Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {trialInfo.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-red-500"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {trialInfo.isOnTrial ? 'Free Trial Active' : 'No Active Trial'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {trialInfo.statusMessage}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trialInfo.isOnTrial 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {trialInfo.isOnTrial ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {trialInfo.isOnTrial && trialInfo.trialEndFormatted && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Trial ends: {trialInfo.trialEndFormatted}
                          </span>
                        </div>
                        {trialInfo.daysRemaining !== null && (
                          <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                            {trialInfo.daysRemaining === 0 
                              ? 'Trial ends today' 
                              : trialInfo.daysRemaining === 1 
                              ? 'Trial ends tomorrow'
                              : `${trialInfo.daysRemaining} days remaining`
                            }
                          </p>
                        )}
                      </div>
                    )}

                    {trialInfo.isOnTrial && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button 
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => setActiveTab('pricing')}
                        >
                          Upgrade Plan
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setActiveTab('usage')}
                >
                  <DollarSign className="h-6 w-6" />
                  <span>View Usage</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setActiveTab('pricing')}
                >
                  <TrendingUp className="h-6 w-6" />
                  <span>Pricing Calculator</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => window.open('https://billing.stripe.com/p/login/test_fZu8wPeit9J33Yu4Kb2go00', '_blank')}
                >
                  <ExternalLink className="h-6 w-6" />
                  <span>Manage Subscription</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-6 w-6" />
                  <span>Billing Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'usage' && (
        <>
          {/* Usage Summary Cards */}
          {usageSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <DollarSign className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(usageSummary.total.cost)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">SMS Messages</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {usageSummary.sms.count.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(usageSummary.sms.cost)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Voice Minutes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {usageSummary.voice.minutes.toFixed(1)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(usageSummary.voice.cost)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Markup</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {billingSettings?.default_markup_percentage || 20}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Profit margin</p>
              </div>
            </div>
          </div>
        </div>
          )}

          {/* Monthly Billing History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Billing History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  SMS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Voice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {monthlyBilling.map((bill) => (
                <tr key={bill.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(bill.billing_month)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {bill.sms_count.toLocaleString()} messages
                    <br />
                    <span className="text-xs">{formatCurrency(bill.sms_cost)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {bill.voice_minutes.toFixed(1)} minutes
                    <br />
                    <span className="text-xs">{formatCurrency(bill.voice_cost)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(bill.total_cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      bill.status === 'paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : bill.status === 'billed'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {bill.invoice_number && (
                      <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Pricing Calculator Tab */}
      {activeTab === 'pricing' && (
        <PricingCalculator />
      )}

      {/* Billing Settings Modal */}
      {showSettings && billingSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Billing Settings</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Markup Percentage
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={billingSettings.default_markup_percentage}
                  onChange={(e) => setBillingSettings({
                    ...billingSettings,
                    default_markup_percentage: parseFloat(e.target.value)
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Billing Cycle
                </label>
                <select
                  value={billingSettings.billing_cycle}
                  onChange={(e) => setBillingSettings({
                    ...billingSettings,
                    billing_cycle: e.target.value
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={billingSettings.billing_email || ''}
                  onChange={(e) => setBillingSettings({
                    ...billingSettings,
                    billing_email: e.target.value
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    const { data: userOrg } = await supabase
                      .from('user_organizations')
                      .select('organization_id')
                      .eq('user_id', user.id)
                      .single();

                    if (!userOrg) return;

                    const response = await fetch(`/api/billing/settings/${userOrg.organization_id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(billingSettings)
                    });

                    if (response.ok) {
                      toast.success('Billing settings updated');
                      setShowSettings(false);
                    } else {
                      toast.error('Failed to update settings');
                    }
                  } catch (error) {
                    console.error('Error updating settings:', error);
                    toast.error('Failed to update settings');
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
