import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { supabase } from '../../utils/supabaseClient';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import PricingTable from './PricingTable';
import { CustomerPaymentMethodSummary, PlanCatalogRow } from '../../types/billing';
import { ArrowRight, ArrowLeft, CheckCircle, Users, Clock, Shield } from 'lucide-react';
import BrandForm from '../sms/BrandForm';
import CampaignForm from '../sms/CampaignForm';
import TollFreeForm from '../sms/TollFreeForm';

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

type FlowStep = 'organization' | 'plan' | 'payment' | 'sms-verification' | 'success';
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
  setOrgId
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsLoading(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || 'Unable to process payment details');
        return;
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: 'if_required'
      });

      if (stripeError) {
        onError(stripeError.message || 'Payment failed');
        return;
      }

      const savedPaymentMethodId =
        typeof paymentIntent?.payment_method === 'string'
          ? paymentIntent.payment_method
          : paymentIntent?.payment_method && typeof paymentIntent.payment_method === 'object'
            ? (paymentIntent.payment_method as { id: string }).id
            : undefined;

      toast.success('Payment details saved');

      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        onError('Not authenticated');
        return;
      }

      const response = await fetch('/api/billing/orgs/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
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
          paymentMethodId: savedPaymentMethodId,
          useExistingPaymentMethod: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to create organization');
      }

      const result = await response.json();

      if (result.org && result.org.id) {
        setOrgId(result.org.id);
      }

      toast.success(trialSelected ? 'Organization and trial subscription created successfully' : 'Organization and subscription created successfully');
      if (trialSelected) {
        toast.success('Your 7-day free trial has begun!');
      }

      await onSuccess();
    } catch (error) {
      console.error('Error creating subscription:', error);
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="space-y-6">
        <PlanSummary orgName={orgName} selectedPlan={selectedPlan} trialSelected={trialSelected} />
        <PaymentElement options={{ layout: { type: 'tabs', defaultCollapsed: false } }} />
        {isLoading && <div className="text-sm text-red-500">Processing payment...</div>}
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
  savedPaymentMethod
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

      const response = await fetch('/api/billing/orgs/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
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
          useExistingPaymentMethod: true
        })
      });

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
          <p className="mt-1 text-xs">
            {savedPaymentMethod.brand ? savedPaymentMethod.brand.toUpperCase() : 'Card'} ending in {savedPaymentMethod.last4}
            {savedPaymentMethod.exp_month && savedPaymentMethod.exp_year
              ? ` · Expires ${savedPaymentMethod.exp_month}/${savedPaymentMethod.exp_year}`
              : ''}
          </p>
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
        {trialSelected && ' This includes a 7-day free trial.'}
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
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {selectedPlan.included_minutes.toLocaleString()} min
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

const SeamlessBillingFlow: React.FC<SeamlessBillingFlowProps> = ({ onClose, existingOrganization }) => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { setTitle } = useBreadcrumbs();

  const mode: OrgMode = existingOrganization ? 'renewal' : 'new';
  const skipOrgStep = mode === 'renewal';
  const skipSmsStep = mode === 'renewal';

  const [currentStep, setCurrentStep] = useState<FlowStep>(skipOrgStep ? 'plan' : 'organization');
  const [completedSteps, setCompletedSteps] = useState<FlowStep[]>(skipOrgStep ? ['organization'] : []);
  const [plans, setPlans] = useState<PlanCatalogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string>('');

  const [orgName, setOrgName] = useState(
    existingOrganization?.name || user?.organization?.name || ''
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanCatalogRow | null>(null);
  const [trialSelected, setTrialSelected] = useState(mode === 'new');

  const [savedPaymentMethod, setSavedPaymentMethod] = useState<CustomerPaymentMethodSummary | null>(null);
  const [hasDefaultPaymentMethod, setHasDefaultPaymentMethod] = useState(false);
  const [useExistingPaymentMethod, setUseExistingPaymentMethod] = useState(mode === 'renewal');
  const [loadingDefaultPaymentMethod, setLoadingDefaultPaymentMethod] = useState(false);

  useEffect(() => {
    setTitle('Get Started');
    fetchPlans();
    if (mode === 'renewal' && existingOrganization?.id) {
      fetchDefaultPaymentMethod(existingOrganization.id);
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

      const response = await fetch('/api/billing/plans', {
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
      setLoadingDefaultPaymentMethod(true);
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }

      const params = new URLSearchParams({ orgId });
      const response = await fetch(`/api/billing/orgs/payment-methods/default?${params.toString()}`, {
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
        setUseExistingPaymentMethod(true);
      } else {
        setSavedPaymentMethod(null);
        setHasDefaultPaymentMethod(false);
        setUseExistingPaymentMethod(false);
      }
    } catch (err) {
      console.error('Error fetching default payment method:', err);
      setSavedPaymentMethod(null);
      setHasDefaultPaymentMethod(false);
      setUseExistingPaymentMethod(false);
    } finally {
      setLoadingDefaultPaymentMethod(false);
    }
  };

  const createPaymentIntent = async (plan: PlanCatalogRow) => {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('You must be logged in to subscribe');
    }

    const response = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        amount: plan.base_price_cents,
        currency: 'usd'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    const data = await response.json();
    if (!data.clientSecret) {
      throw new Error('No client secret received');
    }

    setClientSecret(data.clientSecret);
  };

  useEffect(() => {
    if (
      currentStep === 'payment' &&
      !useExistingPaymentMethod &&
      !clientSecret &&
      selectedPlan &&
      mode === 'renewal'
    ) {
      setLoading(true);
      createPaymentIntent(selectedPlan)
        .catch((err: { message?: string }) => {
          console.error('Error preparing payment intent after switching cards:', err);
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
        if (!(mode === 'renewal' && hasDefaultPaymentMethod && useExistingPaymentMethod)) {
          await createPaymentIntent(selectedPlan);
        }

        setCompletedSteps((prev) => Array.from(new Set([...prev, 'payment'])));
        setCurrentStep('payment');
        setError(null);
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

    if (currentStep === 'sms-verification') {
      setCompletedSteps(['organization', 'plan', 'payment']);
      setCurrentStep('payment');
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

    setCompletedSteps(['organization', 'plan', 'payment']);
    setCurrentStep('sms-verification');
    toast.success('Organization created successfully!');
  };

  const handleSmsVerificationComplete = () => {
    setCompletedSteps(['organization', 'plan', 'payment', 'sms-verification', 'success']);
    setCurrentStep('success');
    toast.success('SMS verification setup completed!');
  };

  const handleGoToDashboard = async () => {
    await refreshUser();
    onClose();
    navigate('/pipeline');
  };

  const renderSavedCardOptions = () => {
    if (!(mode === 'renewal' && hasDefaultPaymentMethod && savedPaymentMethod)) {
      return null;
    }

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Method</p>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setUseExistingPaymentMethod(true)}
            disabled={loadingDefaultPaymentMethod}
            className={`w-full rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
              useExistingPaymentMethod
                ? 'border-red-400 bg-red-50 text-gray-900 shadow-sm dark:border-red-500/60 dark:bg-red-500/10'
                : 'border-gray-200 bg-white text-gray-700 hover:border-red-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
            }`}
          >
            <p className="text-sm font-semibold">Use saved card</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {savedPaymentMethod.brand ? savedPaymentMethod.brand.toUpperCase() : 'Card'} ending in {savedPaymentMethod.last4}
              {savedPaymentMethod.exp_month && savedPaymentMethod.exp_year
                ? ` · Expires ${savedPaymentMethod.exp_month}/${savedPaymentMethod.exp_year}`
                : ''}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {loadingDefaultPaymentMethod ? 'Checking saved card…' : 'We’ll reuse this card automatically'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setUseExistingPaymentMethod(false)}
            className={`w-full rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
              !useExistingPaymentMethod
                ? 'border-red-400 bg-red-50 text-gray-900 shadow-sm dark:border-red-500/60 dark:bg-red-500/10'
                : 'border-gray-200 bg-white text-gray-700 hover-border-red-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
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
                <ArrowRight className="ml-2 h-4 w-4 text-red-500" />
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
                savedPaymentMethod={savedPaymentMethod}
              />
            ) : clientSecret ? (
              <Elements
                stripe={stripePromise!}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'flat',
                    variables: {
                      colorPrimary: '#f6339a'
                    }
                  }
                }}
              >
                <PaymentForm
                  orgName={orgName}
                  selectedPlan={selectedPlan}
                  trialSelected={trialSelected}
                  onSuccess={handleSuccess}
                  onBack={handleBack}
                  onError={setError}
                  isLoading={loading}
                  setIsLoading={setLoading}
                  clientSecret={clientSecret}
                  setOrgId={setOrgId}
                />
              </Elements>
            ) : (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
                Preparing payment session...
              </div>
            )}
          </div>
        );
      }
      case 'sms-verification':
        if (!showSmsStep) {
          handleSuccess();
          return null;
        }

        return orgId ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">SMS Verification Setup</h2>
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                This step is <strong>optional</strong> but highly recommended for better SMS delivery.
              </p>
            </div>

            <div className="space-y-6">
              <BrandForm orgId={orgId} onSave={() => {}} userRole={user?.role} />
              <CampaignForm orgId={orgId} onSave={() => {}} onSubmit10DLC={() => {}} userRole={user?.role} />
              <TollFreeForm orgId={orgId} onSubmit={() => {}} userRole={user?.role} />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSmsVerificationComplete}>Continue to Dashboard</Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-red-500"></div>
            <p className="text-gray-600">Loading verification setup...</p>
          </div>
        );
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
                  ? 'Access has been restored. You can continue using Paperboat CRM.'
                  : 'Your organization has been created successfully.'}
                {mode === 'new' && trialSelected && ' Enjoy your 7-day free trial!'}
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
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    1
                  </div>
                  <div className="h-1 w-16 bg-red-500" />
                </>
              )}

              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep === 'plan' || completedSteps.includes('plan')
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {skipOrgStep ? 1 : 2}
              </div>
              <div className="h-1 w-16 bg-red-500" />

              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep === 'payment' || completedSteps.includes('payment')
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {skipOrgStep ? 2 : 3}
              </div>

              {!skipSmsStep && (
                <>
                  <div className="h-1 w-16 bg-red-500" />
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      currentStep === 'sms-verification' || completedSteps.includes('sms-verification')
                        ? 'bg-red-500 text-white'
                        : currentStep === 'success'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    4
                  </div>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">{error}</p>
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
