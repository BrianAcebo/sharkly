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
  Mail,
  AlertCircle,
  CreditCard,
  Clock,
  Users,
  Calendar,
  ExternalLink
} from 'lucide-react';
import PricingCalculator from '../components/billing/PricingCalculator';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { STRIPE_CUSTOMER_PORTAL_URL, canManageBilling } from '../utils/billing';
import { useAuth } from '../hooks/useAuth';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { WalletDepositModal } from '../components/billing/WalletDepositModal';

type UsageRecord = Record<string, unknown>;

interface UsageSummary {
  sms: {
    count: number;
    cost: number;
    records: UsageRecord[];
  };
  voice: {
    minutes: number;
    cost: number;
    records: UsageRecord[];
  };
  email: {
    count: number;
    cost: number;
    records: UsageRecord[];
  };
  total: {
    cost: number;
    sms_cost: number;
    voice_cost: number;
    email_cost: number;
  };
}

interface BillingSettings {
  default_markup_percentage: number;
  billing_cycle: string;
  auto_billing: boolean;
  billing_email?: string;
  payment_method?: string;
}

interface StripeInvoice {
  id: string;
  object: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  application_fee_amount: number | null;
  attempt_count: number;
  attempted: boolean;
  auto_advance: boolean;
  billing_reason: string | null;
  billing_session: string | null;
  charge: string;
  collection_method: string;
  created: number;
  currency: string;
  custom_fields: string | null;
  customer: string;
  customer_address: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_shipping: string | null;
  customer_tax_exempt: string | null;
  customer_tax_ids: string[] | null;
  default_payment_method: string | null;
  default_source: string | null;
  default_tax_rates: string[] | null;
  description: string | null;
  discount: string | null;
  due_date: number | null;
  ending_balance: number;
  footer: string | null;
  hosted_invoice_url: string;
  invoice_pdf: string;
  lines: {
    id: string;
    object: string;
    amount: number;
    currency: string;
    description: string | null;
    discountable: boolean;
    invoice_item: string;
    invoice_line_item: string;
    livemode: boolean;
    metadata: Record<string, unknown>;
    period: {
      end: number;
      start: number;
    };
    plan: {
      id: string;
      object: string;
      active: boolean;
      aggregate_usage: string | null;
      amount: number;
      amount_decimal: string;
      billing_scheme: string;
      created: number;
      currency: string;
      interval: string;
      interval_count: number;
      livemode: boolean;
      metadata: Record<string, unknown>;
      nickname: string | null;
      product: string;
      tiers: string | null;
      tiers_mode: string | null;
      transform_usage: string | null;
      unit_amount: number;
      unit_amount_decimal: string;
    };
    proration: boolean;
    quantity: number;
    subscription: string | null;
    subscription_item: string;
    tax_amounts: string[] | null;
    tax_rates: string[] | null;
    type: string;
    unit_amount: number;
    unit_amount_decimal: string;
  }[];
  livemode: boolean;
  metadata: Record<string, unknown>;
  next_payment_attempt: number | null;
  number: string | null;
  paid: boolean;
  paid_at: number | null;
  payment_intent: string | null;
  payment_settings: {
    payment_method_options: {
      card: {
        request_three_d_secure: string;
      };
    };
    payment_method_types: string[];
    save_default_payment_method: string;
  };
  period_end: number;
  period_start: number;
  post_payment_credit_notes_amount: number;
  pre_payment_credit_notes_amount: number;
  quote: string | null;
  receipt_number: string | null;
  rendering_options: string | null;
  shipping_cost: string | null;
  starting_balance: number;
  statement_descriptor: string | null;
  status: string;
  status_transitions: {
    finalized_at: number | null;
    marked_uncollectible_at: number | null;
    paid_at: number | null;
    voided_at: number | null;
  };
  subscription: string | null;
  subtotal: number;
  tax_amounts: string[] | null;
  tax_rates: string[] | null;
  total: number;
  total_tax_amounts: string[] | null;
  transfer_data: string | null;
  webhooks_delivered_at: number | null;
}

const Billing: React.FC = () => {
  const { organization, loading: orgLoading } = useOrganization();
  const trialInfo = useTrial();
  const { setTitle } = useBreadcrumbs();
  const { user } = useAuth();
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [voicePrice, setVoicePrice] = useState<{ id: string; unit_amount?: number | null; currency?: string | null } | null>(null);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { walletStatus, refetch: refetchPayment } = usePaymentStatus();
  const [depositOpen, setDepositOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'pricing' | 'invoices'>('overview');
  const [invoices, setInvoices] = useState<StripeInvoice[] | null>(null);
  const [invoicePagination, setInvoicePagination] = useState({
    hasMore: false,
    startingAfter: null as string | null,
    endingBefore: null as string | null
  });

  useEffect(() => {
    setTitle('Billing & Usage');
    fetchBillingData();
  }, [setTitle]);

  useEffect(() => {
    if (organization?.stripe_customer_id) {
      fetchInvoices(organization.stripe_customer_id, invoicePagination.startingAfter, invoicePagination.endingBefore);
    }
  }, [organization?.stripe_customer_id, invoicePagination.startingAfter, invoicePagination.endingBefore]);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('User not authenticated');
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

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

      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      const usageResponse = await fetch(
        `/api/billing/usage-summary/${organizationId}?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsageSummary(usageData.summary);
      } else {
        setUsageSummary(null);
      }

      const billingResponse = await fetch(`/api/billing/settings/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (billingResponse.ok) {
        const settingsData = await billingResponse.json();
        setBillingSettings(settingsData.settings);
      }

      // Voice price (Stripe metered item) for per-unit display
      const priceResp = await fetch(`/api/billing/voice-price`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      if (priceResp.ok) {
        const p = await priceResp.json();
        setVoicePrice({ id: p.stripe_price?.id, unit_amount: p.stripe_price?.unit_amount, currency: p.stripe_price?.currency });
      }

    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to fetch billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoices = async (customerId: string, startingAfter?: string | null, endingBefore?: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }

      const query = new URLSearchParams();
      query.append('customerId', customerId);
      query.append('limit', '10');
      if (startingAfter) query.append('starting_after', startingAfter);
      if (endingBefore) query.append('ending_before', endingBefore);

      const response = await fetch(`/api/billing/invoices?${query.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data.data || []);
      setInvoicePagination((prev) => ({
        ...prev,
        hasMore: data.has_more || false
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    }
  };

  const goToNextInvoicePage = () => {
    if (invoices && invoices.length > 0) {
      setInvoicePagination((prev) => ({
        ...prev,
        startingAfter: invoices[invoices.length - 1].id,
        endingBefore: null
      }));
    }
  };

  const goToPreviousInvoicePage = () => {
    if (invoices && invoices.length > 0) {
      setInvoicePagination((prev) => ({
        ...prev,
        endingBefore: invoices[0].id,
        startingAfter: null
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-500"></div>
      </div>
    );
  }

  const userRole = user?.role || null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Usage</h1>
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
            Usage Costs
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
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invoices'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Invoices
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Plan & Subscription Status */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              {walletStatus && (
                <div className="mt-2 text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    walletStatus.wallet?.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : walletStatus.wallet?.status === 'suspended'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    Wallet: {walletStatus.wallet?.status ?? 'missing'}
                  </span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    Balance: ${((walletStatus.wallet?.balance_cents ?? 0) / 100).toFixed(2)}
                  </span>
                  {walletStatus.depositRequired && (
                    <Button size="sm" className="ml-2" onClick={() => setDepositOpen(true)}>Deposit</Button>
                  )}
                </div>
              )}
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
                      {organization && canManageBilling(userRole) && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(STRIPE_CUSTOMER_PORTAL_URL, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Manage Subscription
                        </Button>
                  <Button
                    variant="secondary"
                    className="w-full mt-2"
                    onClick={() => setDepositOpen(true)}
                  >
                    Deposit Funds
                  </Button>
                      )}
                      {organization && !canManageBilling(userRole) && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                          Only an owner or admin can manage billing settings.
                        </p>
                      )}
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
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                      <DollarSign className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(usageSummary?.total.cost || 0)}
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
                        {usageSummary?.sms.count || 0}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(usageSummary?.sms.cost || 0)}
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
                        {usageSummary?.voice.minutes?.toFixed(1) || '0.0'}
                      </p>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <div>{formatCurrency(usageSummary?.voice.cost || 0)} this period</div>
                        {voicePrice?.unit_amount != null && (
                          <div className="text-xs">
                            Price: {formatCurrency((voicePrice.unit_amount || 0) / 100)} per minute
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Mail className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Emails Sent</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {usageSummary?.email?.count ?? 0}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(usageSummary?.email?.cost ?? 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* Pricing Calculator Tab */}
      {activeTab === 'pricing' && (
        <PricingCalculator />
      )}

      {activeTab === 'invoices' && (
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices && invoices.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{invoice.number ?? invoice.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency((invoice.total ?? 0) / 100)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{invoice.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.created ? new Date(invoice.created * 1000).toLocaleDateString() : ''}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (invoice.invoice_pdf) {
                              window.open(invoice.invoice_pdf, '_blank');
                            } else if (invoice.hosted_invoice_url) {
                              window.open(invoice.hosted_invoice_url, '_blank');
                            } else {
                              toast.info('Invoice PDF unavailable.');
                            }
                          }}
                        >
                          View PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No invoices found.
                </p>
              </div>
            )}
            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={!invoicePagination.endingBefore}
                onClick={goToPreviousInvoicePage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!invoicePagination.hasMore}
                onClick={goToNextInvoicePage}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Settings Modal */}
      {billingSettings && (
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

      <WalletDepositModal open={depositOpen} onClose={() => { setDepositOpen(false); refetchPayment(); }} />
    </div>
  );
};

export default Billing;
