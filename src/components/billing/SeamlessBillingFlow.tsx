import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { useOrganization } from '../../hooks/useOrganization';
import { useOrganizationStatus } from '../../hooks/useOrganizationStatus';
import { supabase } from '../../utils/supabaseClient';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import PricingTable from './PricingTable';
import UpfrontBillingDisclaimer from './UpfrontBillingDisclaimer';
import { CustomerPaymentMethodSummary, PlanCatalogRow } from '../../types/billing';
import { ArrowRight, ArrowLeft, CheckCircle, Users } from 'lucide-react';
import { CreditCard as CreditCardIcon } from 'lucide-react';
import { SiVisa, SiMastercard, SiAmericanexpress, SiDiscover, SiDinersclub, SiJcb } from 'react-icons/si';
import { api } from '../../utils/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface SeamlessBillingFlowProps {
  onClose: () => void;
  existingOrganization?: {
    id: string;
    name: string;
    stripe_customer_id: string | null;
    plan_code: string | null;
  } | null;
}

type FlowStep = 'organization' | 'plan' | 'payment' | 'success';
type OrgMode = 'new' | 'renewal';

interface PaymentFormProps {
  orgName: string;
  selectedPlan: PlanCatalogRow;
  trialSelected: boolean;
  onSuccess: () => void;
  onBack: () => void;
  onError: (message: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  clientSecret: string;
  setOrgId: (id: string) => void;
  existingOrgId?: string | null;
  setupClientSecret?: string | null;
}

interface ExistingPaymentMethodFormProps {
  orgName: string;
  selectedPlan: PlanCatalogRow;
  trialSelected: boolean;
  onSuccess: () => void;
  onBack: () => void;
  onError: (message: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setOrgId: (id: string) => void;
  savedPaymentMethod: CustomerPaymentMethodSummary;
  existingOrgId?: string | null;
  selectedPaymentMethodId?: string | null;
}

interface PlanSummaryProps {
  orgName: string;
  selectedPlan: PlanCatalogRow;
  trialSelected: boolean;
}

interface FormActionsProps {
  onBack: () => void;
  isLoading: boolean;
  primaryLabel?: string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  orgName,
  selectedPlan,
  trialSelected,
  onSuccess,
  onBack,
  onError,
  isLoading,
  setIsLoading,
  clientSecret,
  setOrgId,
  existingOrgId,
  setupClientSecret,
  
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) { onError(submitError.message ?? 'Unable to process payment details'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { onError('Not authenticated'); return; }

      const onboard = async (opts: { pmId?: string; useExisting?: boolean }) => {
        const resp = await api.post(
          '/api/billing/orgs/onboard',
          {
            orgId: existingOrgId ?? undefined,
            name: orgName,
            planCode: selectedPlan.plan_code,
            trialDays: trialSelected ? 7 : 0,
            tz: 'America/New_York',
            address: { street: '', city: '', state: '', zip: '', country: 'US' },
            paymentMethodId: opts.pmId,
            // Only allow using an existing default payment method when explicitly chosen by the user
            useExistingPaymentMethod: Boolean(opts.useExisting)
          },
          { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` } }
        );
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || err.message || 'Failed to create organization');
        }
        const result = await resp.json();
        // New policy: org may be null for new flow (created after payment via webhook)
        // We don't update clientSecret here; parent controls it when needed
        if (result.org?.id) setOrgId(result.org.id);
      };

      // PATH 1: SetupIntent ONLY
      if (setupClientSecret && !clientSecret) {
        const { error: setupError, setupIntent } = await stripe.confirmSetup({
          elements,
          clientSecret: setupClientSecret,
          redirect: 'if_required'
        });
        if (setupError) { onError(setupError.message ?? 'Unable to save payment method'); return; }

        const pmId = typeof setupIntent?.payment_method === 'string'
          ? setupIntent.payment_method
          : (setupIntent?.payment_method && 'id' in (setupIntent.payment_method as object)
              ? (setupIntent.payment_method as { id: string }).id
              : undefined);
        if (!pmId) { onError('No payment method created'); return; }

        // Client-side no longer blocks when PM is on a different customer; backend will safely migrate it if allowed

        await onboard({ pmId, useExisting: false });
        toast.success('Payment method saved');
        await onSuccess();
        return;
      }

      // PATH 2: PaymentIntent ONLY
      if (clientSecret && !setupClientSecret) {
        const { error: piErr } = await stripe.confirmPayment({
          elements,
          clientSecret,
          redirect: 'if_required'
        });
        if (piErr) { onError(piErr.message ?? 'Payment failed'); return; }
        // The subscription and PI were created in the previous step.
        // Do NOT call /onboard again here or you'll create a second subscription that auto-pays.
        toast.success('Payment succeeded. Finalizing organization setup...');
        await onSuccess();
        return;
      }

      onError('Payment not prepared. Go back and try again.');
    } catch (err) {
      console.error(err);
      onError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="space-y-6">
        <PlanSummary orgName={orgName} selectedPlan={selectedPlan} trialSelected={trialSelected} />
        <PaymentElement options={{ layout: { type: 'tabs', defaultCollapsed: false } }} />
        {isLoading && <div className="text-sm text-blue-500">Processing payment...</div>}
      </div>
      <FormActions onBack={onBack} isLoading={isLoading} primaryLabel="Complete" />
    </form>
  );
};

const ExistingPaymentMethodForm: React.FC<ExistingPaymentMethodFormProps> = ({
  orgName,
  selectedPlan,
  trialSelected,
  onSuccess,
  onBack,
  onError,
  isLoading,
  setIsLoading,
  setOrgId,
  savedPaymentMethod,
  existingOrgId,
  selectedPaymentMethodId
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        onError('Not authenticated');
        return;
      }

      const response = await api.post(
        '/api/billing/orgs/onboard',
        {
          orgId: existingOrgId ?? undefined,
          name: orgName,
          planCode: selectedPlan.plan_code,
          trialDays: trialSelected ? 7 : 0,
          website: '',
          industry: '',
          ein: '',
          tz: 'America/New_York',
          address: {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: 'US'
          },
          useExistingPaymentMethod: true,
          paymentMethodId: selectedPaymentMethodId || savedPaymentMethod.id
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to create organization');
      }

      const result = await response.json();

      if (result.org && result.org.id) {
        setOrgId(result.org.id);
      }

      toast.success(
        trialSelected
          ? 'Subscription created – the trial will convert to a paid plan automatically'
          : 'Subscription created with saved payment method'
      );
      await onSuccess();
    } catch (error) {
      console.error('Error creating subscription (saved payment method):', error);
      onError(error instanceof Error ? error.message : 'Failed to create subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="space-y-6">
        <PlanSummary orgName={orgName} selectedPlan={selectedPlan} trialSelected={trialSelected} />
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-5 py-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-100">
          <p className="font-semibold">
            {trialSelected
              ? 'Your saved card will be charged automatically at the end of the trial.'
              : 'We will charge your saved card automatically.'}
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <div className="px-2 py-0.5 border border-gray-200 rounded-sm">
              <BrandIcon brand={savedPaymentMethod.brand || undefined} />
            </div>
            <p>
              {(savedPaymentMethod.brand || 'Card').toUpperCase()} ending in {savedPaymentMethod.last4}
              {savedPaymentMethod.exp_month && savedPaymentMethod.exp_year ? ` · Expires ${savedPaymentMethod.exp_month}/${savedPaymentMethod.exp_year}` : ''}
            </p>
          </div>
        </div>
      </div>
      <FormActions onBack={onBack} isLoading={isLoading} primaryLabel="Complete" />
    </form>
  );
};

const PlanSummary: React.FC<PlanSummaryProps> = ({ orgName, selectedPlan, trialSelected }) => (
  <div className="space-y-4 text-sm">
    <div className="text-center">
      <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Complete Your Setup</h3>
      <p className="text-gray-600 dark:text-gray-400">
        You're about to create <strong>{orgName}</strong> with the <strong>{selectedPlan.name}</strong> plan.
        {trialSelected && ' This includes a 7‑day pay‑as‑you‑go trial.'}
      </p>
    </div>

    <Card className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/40">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">{selectedPlan.name}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedPlan.base_price_cents / 100)} / month
            </p>
          </div>
          <div className="text-right text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <Users className="mr-1 h-4 w-4" />
              {selectedPlan.included_seats} seat{selectedPlan.included_seats !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const FormActions: React.FC<FormActionsProps> = ({ onBack, isLoading, primaryLabel = 'Complete' }) => (
  <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
    <Button size="sm" variant="outline" onClick={onBack} disabled={isLoading}>
      Back
    </Button>
    <Button size="sm" type="submit" disabled={isLoading}>
      {isLoading ? 'Processing…' : primaryLabel}
    </Button>
  </div>
);

function BrandIcon({ brand, className = 'h-5 w-5' }: { brand?: string | null; className?: string }) {
  const b = (brand || '').toLowerCase();
  if (b === 'visa') return <SiVisa className={className} />;
  if (b === 'mastercard' || b === 'mc' || b === 'master card') return <SiMastercard className={className} />;
  if (b === 'american_express' || b === 'amex') return <SiAmericanexpress className={className} />;
  if (b === 'discover') return <SiDiscover className={className} />;
  if (b === 'diners' || b === 'diners_club' || b === 'diners club') return <SiDinersclub className={className} />;
  if (b === 'jcb') return <SiJcb className={className} />;
  return <CreditCardIcon className={className} />;
}

const SeamlessBillingFlow: React.FC<SeamlessBillingFlowProps> = ({ onClose, existingOrganization }) => {
  const { user, refreshUser } = useAuth();
  // const navigate = useNavigate();
  const { setTitle } = useBreadcrumbs();
  const { refetch: refetchOrganization } = useOrganization();
  const { getOrganizationStatus } = useOrganizationStatus();

  const mode: OrgMode = existingOrganization ? 'renewal' : 'new';
  const skipOrgStep = mode === 'renewal';

  const [currentStep, setCurrentStep] = useState<FlowStep>(skipOrgStep ? 'plan' : 'organization');
  const [completedSteps, setCompletedSteps] = useState<FlowStep[]>(skipOrgStep ? ['organization'] : []);
  const [plans, setPlans] = useState<PlanCatalogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string>('');

  const [orgName, setOrgName] = useState(
    existingOrganization?.name || user?.organization?.name || ''
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanCatalogRow | null>(null);
  const [trialSelected, setTrialSelected] = useState(false);
  // Twilio provisioning removed: no area code or provisioning state

  const [savedPaymentMethod, setSavedPaymentMethod] = useState<CustomerPaymentMethodSummary | null>(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<CustomerPaymentMethodSummary[]>([]);
  const [selectedSavedPaymentMethodId, setSelectedSavedPaymentMethodId] = useState<string | null>(null);
  const [hasDefaultPaymentMethod, setHasDefaultPaymentMethod] = useState(false);
  // Do not auto-select saved PM; user must explicitly opt-in
  const [useExistingPaymentMethod, setUseExistingPaymentMethod] = useState(false);
  // const [loadingDefaultPaymentMethod, setLoadingDefaultPaymentMethod] = useState(false);

  useEffect(() => {
    setTitle('Get Started');
    fetchPlans();
    if (mode === 'renewal' && existingOrganization?.id) {
      fetchDefaultPaymentMethod(existingOrganization.id);
      fetchPaymentMethods(existingOrganization.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTitle, mode, existingOrganization?.id]);

  const fetchPlans = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await api.get('/api/billing/plans', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      const { plans } = data;

      setPlans(plans);

      if (existingOrganization?.plan_code) {
        const current = plans.find((p: PlanCatalogRow) => p.plan_code === existingOrganization.plan_code);
        setSelectedPlan(current || plans[0]);
      } else {
        setSelectedPlan(plans[1] || plans[0] || null);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      toast.error('Failed to fetch plans');
    }
  };

  const fetchDefaultPaymentMethod = async (orgId: string) => {
    try {
      // setLoadingDefaultPaymentMethod(true);
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }

      const params = new URLSearchParams({ orgId });
      const response = await api.get(`/api/billing/orgs/payment-methods/default?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load saved payment method');
      }

      const data = await response.json();
      if (data.hasDefault) {
        setSavedPaymentMethod(data.defaultPaymentMethod as CustomerPaymentMethodSummary);
        setHasDefaultPaymentMethod(true);
        // only enable when user explicitly selects
        setSelectedSavedPaymentMethodId((data.defaultPaymentMethod as CustomerPaymentMethodSummary).id);
      } else {
        setSavedPaymentMethod(null);
        setHasDefaultPaymentMethod(false);
        setUseExistingPaymentMethod(false);
        setSelectedSavedPaymentMethodId(null);
      }
    } catch (err) {
      console.error('Error fetching default payment method:', err);
      setSavedPaymentMethod(null);
      setHasDefaultPaymentMethod(false);
      setUseExistingPaymentMethod(false);
    } finally {
      // setLoadingDefaultPaymentMethod(false);
    }
  };

  const fetchPaymentMethods = async (orgId: string) => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const params = new URLSearchParams({ orgId });
      const res = await api.get(`/api/billing/orgs/payment-methods?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setSavedPaymentMethods(Array.isArray(data.paymentMethods) ? data.paymentMethods : []);
      if (data.defaultPaymentMethodId) {
        setSelectedSavedPaymentMethodId(data.defaultPaymentMethodId);
      }
    } catch (e) {
      console.error('Error loading payment methods list', e);
    }
  };

  // Removed standalone createPaymentIntent; PI will come from onboard subscription response

  const createSetupOnly = async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('You must be logged in to subscribe');
    }
    // Ensure we have a Stripe customerId for this org (recover/create if missing)
    let customerId = existingOrganization?.stripe_customer_id || null;
    if (!customerId && existingOrganization?.id && selectedPlan) {
      const ensureResp = await api.post(
        '/api/billing/orgs/onboard',
        {
          orgId: existingOrganization.id,
          name: orgName,
          planCode: selectedPlan.plan_code,
          trialDays: trialSelected ? 7 : 0,
          tz: 'America/New_York',
          address: { street: '', city: '', state: '', zip: '', country: 'US' },
          useExistingPaymentMethod: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );
      if (ensureResp.ok) {
        const data = await ensureResp.json();
        customerId = data?.org?.stripe_customer_id || null;
        if (data?.subscriptionClientSecret && !setupSecret) {
          // If backend started a subscription, prefer confirming PI path
          setClientSecret(data.subscriptionClientSecret);
        }
      }
    }

    const response = await api.post(
      '/api/payments/create-setup-intent',
      { customerId: customerId || undefined },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        }
      }
    );
    if (!response.ok) {
      throw new Error('Failed to create setup intent');
    }
    const data = await response.json();
    setSetupSecret(data.setupClientSecret || null);
  };

  // Removed automatic PI creation on renewal new-card path; we use SetupIntent-only there
  useEffect(() => {
    if (
      currentStep === 'payment' &&
      mode === 'renewal' &&
      !useExistingPaymentMethod &&
      !setupSecret
    ) {
      setLoading(true);
      createSetupOnly()
        .catch((err: { message?: string }) => {
          console.error('Error preparing setup intent after switching cards:', err);
          setError(err?.message || 'Failed to prepare payment');
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useExistingPaymentMethod, currentStep]);

  

  const handleNext = async () => {
    if (currentStep === 'organization') {
      if (!orgName.trim()) {
        setError('Organization name is required');
        return;
      }
      setCompletedSteps(['organization']);
      setCurrentStep('plan');
      setError(null);
      return;
    }

    if (currentStep === 'plan') {
      if (!selectedPlan) {
        setError('Please select a plan');
        return;
      }

      setCompletedSteps((prev) => Array.from(new Set([...prev, 'organization', 'plan'])));

      setLoading(true);
      try {
        if (mode === 'renewal' && !useExistingPaymentMethod) {
          // Renewal with new card: prepare SetupIntent
          await createSetupOnly();
        } else if (mode === 'new') {
          // New org: create pending org + subscription first to get PaymentIntent client secret
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) throw new Error('Not authenticated');
          const resp = await api.post(
            '/api/billing/orgs/onboard',
            {
              name: orgName,
              planCode: selectedPlan.plan_code,
              trialDays: trialSelected ? 7 : 0,
              tz: 'America/New_York',
              address: { street: '', city: '', state: '', zip: '', country: 'US' }
            },
            { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` } }
          );
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to start subscription');
          }
          const data = await resp.json();
          if (data?.org?.id) setOrgId(data.org.id);
          if (data?.subscriptionClientSecret) setClientSecret(data.subscriptionClientSecret);
          if (data?.setupClientSecret) setSetupSecret(data.setupClientSecret);

          // Deterministic step transition for new orgs: proceed when we have either PI or SI secret
          if (data?.subscriptionClientSecret || data?.setupClientSecret) {
            setCurrentStep('payment');
            setError(null);
            return;
          }
          // No secret returned: treat as an error; user must confirm payment before proceeding
          setError('We couldn’t prepare your payment. Please try again.');
          return;
        } else {
          // Renewal using saved card path - no client-side intent required
        }
        if (mode === 'renewal') {
          setCompletedSteps((prev) => Array.from(new Set([...prev, 'payment'])));
          setCurrentStep('payment');
          setError(null);
        }
      } catch (err) {
        console.error('Error preparing payment:', err);
        setError((err as { message?: string })?.message || 'Failed to prepare payment');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 'plan') {
      if (skipOrgStep) {
        setCompletedSteps(['organization']);
      } else {
        setCompletedSteps([]);
        setCurrentStep('organization');
      }
      setError(null);
      return;
    }

    if (currentStep === 'payment') {
      setCompletedSteps(skipOrgStep ? ['organization'] : ['organization', 'plan']);
      setCurrentStep('plan');
      setError(null);
      return;
    }
  };

  const handleSuccess = async () => {
    if (mode === 'renewal') {
      setCompletedSteps(['organization', 'plan', 'payment', 'success']);
      setCurrentStep('success');
      await refreshUser();
      return;
    }

    setCompletedSteps(['organization', 'plan', 'payment', 'success']);
    setCurrentStep('success');
    toast.success('Organization created successfully!');
  };

  const handleGoToDashboard = async () => {
    try {
      await Promise.all([
        refreshUser(),
        getOrganizationStatus(),
        refetchOrganization()
      ]);
    } catch {
      // no-op; we'll hard refresh regardless
    }
    onClose();
    window.location.assign('/cases');
  };

  const renderSavedCardOptions = () => {
    if (!(mode === 'renewal' && (hasDefaultPaymentMethod || savedPaymentMethods.length > 0))) {
      return null;
    }

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Method</p>
        <div className="grid gap-2">
          {savedPaymentMethods.map((pm) => (
            <label
              key={pm.id}
              className={`w-full cursor-pointer rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                useExistingPaymentMethod && selectedSavedPaymentMethodId === pm.id
                  ? 'border-blue-400 bg-blue-50 text-gray-900 shadow-sm dark:border-blue-500/60 dark:bg-blue-500/10'
                  : 'border-gray-200 bg-white text-gray-700 hover-border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              }`}
              onClick={() => {
                setUseExistingPaymentMethod(true);
                setSelectedSavedPaymentMethodId(pm.id);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="px-2 py-0.5 border border-gray-200 rounded-sm">
                    <BrandIcon brand={pm.brand} />
                  </div>
                  <p className="text-sm font-semibold">{(pm.brand || 'Card').toUpperCase()} ending in {pm.last4}</p>
                </div>
                <input type="radio" checked={useExistingPaymentMethod && selectedSavedPaymentMethodId === pm.id} readOnly />
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{pm.exp_month && pm.exp_year ? `Expires ${pm.exp_month}/${pm.exp_year}` : ''}</p>
            </label>
          ))}

          {savedPaymentMethods.length === 0 && savedPaymentMethod && (
            <label
              className={`w-full cursor-pointer rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                useExistingPaymentMethod ? 'border-blue-400 bg-blue-50 text-gray-900 shadow-sm dark:border-blue-500/60 dark:bg-blue-500/10' : 'border-gray-200 bg-white text-gray-700 hover-border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              }`}
              onClick={() => setUseExistingPaymentMethod(true)}
            >
              <div className="flex items-center gap-3">
                <BrandIcon brand={savedPaymentMethod.brand || undefined} />
                <div>
                  <p className="text-sm font-semibold">Use saved card</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{savedPaymentMethod.brand ? savedPaymentMethod.brand.toUpperCase() : 'Card'} ending in {savedPaymentMethod.last4}{savedPaymentMethod.exp_month && savedPaymentMethod.exp_year ? ` · Expires ${savedPaymentMethod.exp_month}/${savedPaymentMethod.exp_year}` : ''}</p>
                </div>
              </div>
            </label>
          )}

          <button
            type="button"
            onClick={() => setUseExistingPaymentMethod(false)}
            className={`w-full rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              !useExistingPaymentMethod
                ? 'border-blue-400 bg-blue-50 text-gray-900 shadow-sm dark:border-blue-500/60 dark:bg-blue-500/10'
                : 'border-gray-200 bg-white text-gray-700 hover-border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
            }`}
          >
            <p className="text-sm font-semibold">Use a different card</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Enter new payment details to update billing</p>
          </button>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      // Twilio provisioning step removed
      case 'organization':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Create Your Organization</h3>
              <p className="text-gray-600 dark:text-gray-400">Let's start by giving your organization a name</p>
            </div>

            <div className="mx-auto mb-4 max-w-md">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="My Company Inc."
                required
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!orgName.trim()}>
                Next: Choose Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      case 'plan':
        return (
          <div className="space-y-6">
            <PricingTable
              plans={plans}
              selectedPlan={selectedPlan?.plan_code || null}
              onSelectPlan={(planCode) => {
                const plan = plans.find((p) => p.plan_code === planCode);
                if (plan) {
                  setSelectedPlan(plan);
                  setError(null);
                }
              }}
              showTrialOption={mode === 'new'}
              trialSelected={trialSelected}
              onTrialToggle={setTrialSelected}
            />
            <UpfrontBillingDisclaimer />

            <div className="flex justify-between">
              {skipOrgStep ? (
                <div />
              ) : (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button onClick={handleNext} disabled={!selectedPlan}>
                Next: Payment Details
                <ArrowRight className="ml-2 h-4 w-4 text-blue-500" />
              </Button>
            </div>
          </div>
        );
      case 'payment': {
        if (!selectedPlan) {
          setError('Please select a plan before continuing.');
          setCurrentStep('plan');
          return null;
        }

        const savedOptions = renderSavedCardOptions();

        return (
          <div className="space-y-6">
            {savedOptions}
            {useExistingPaymentMethod && savedPaymentMethod ? (
              <ExistingPaymentMethodForm
                orgName={orgName}
                selectedPlan={selectedPlan}
                trialSelected={trialSelected}
                onSuccess={handleSuccess}
                onBack={handleBack}
                onError={setError}
                isLoading={loading}
                setIsLoading={setLoading}
                setOrgId={setOrgId}
                savedPaymentMethod={
                  savedPaymentMethods.find((m) => m.id === selectedSavedPaymentMethodId) || savedPaymentMethod
                }
                existingOrgId={existingOrganization?.id || null}
                selectedPaymentMethodId={selectedSavedPaymentMethodId}
              />
            ) : (setupSecret ?? clientSecret) ? (
              <Elements
                stripe={stripePromise!}
                options={{
                  clientSecret: (setupSecret ?? clientSecret)!,
                  appearance: {
                    theme: 'flat',
                    variables: {
                      colorPrimary: '#f6339a'
                    }
                  }
                }}
              >
                <UpfrontBillingDisclaimer className="mb-3" />
                <PaymentForm
                  orgName={orgName}
                  selectedPlan={selectedPlan}
                  trialSelected={trialSelected}
                  onSuccess={handleSuccess}
                  onBack={handleBack}
                  onError={setError}
                  isLoading={loading}
                  setIsLoading={setLoading}
                  clientSecret={(clientSecret ?? '')}
                  setOrgId={setOrgId}
                  existingOrgId={orgId || existingOrganization?.id || null}
                  setupClientSecret={(setupSecret ?? '')}
                />
              </Elements>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
                  We couldn’t prepare your payment session. Go back and try again.
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>Back</Button>
                  <Button onClick={handleNext}>Retry</Button>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'success':
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                {mode === 'renewal' ? 'Subscription Updated!' : `Welcome to ${orgName}!`}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {mode === 'renewal'
                  ? 'Access has been restored. You can continue using True Sight.'
                  : 'Your organization has been created successfully.'}
                {mode === 'new' && trialSelected && ' Enjoy your 7‑day pay‑as‑you‑go trial!'}
              </p>
            </div>
            <Button onClick={handleGoToDashboard} size="lg">
              Go to Dashboard
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-900">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Get Started</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ✕
            </button>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              {!skipOrgStep && (
                <>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      currentStep === 'organization' || completedSteps.includes('organization')
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    1
                  </div>
                  <div className="h-1 w-16 bg-blue-500" />
                </>
              )}

              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep === 'plan' || completedSteps.includes('plan')
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {skipOrgStep ? 1 : 2}
              </div>
              <div className="h-1 w-16 bg-blue-500" />

              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep === 'payment' || completedSteps.includes('payment')
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {skipOrgStep ? 2 : 3}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-600">{error}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SeamlessBillingFlow;

