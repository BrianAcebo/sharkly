import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import Input from '../components/form/input/InputField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { CheckCircle, ArrowRight, ArrowLeft, Users, Clock, MessageSquare, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import PageMeta from '../components/common/PageMeta';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { 
  BillingOnboardingViewState, 
  PlanCatalogRow, 
  OrgOnboardRequest, 
  OrgOnboardResponse,
  PostalAddress,
  PlanCode 
} from '../types/billing';

const BillingOnboarding: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setTitle } = useBreadcrumbs();
  
  const [plans, setPlans] = useState<PlanCatalogRow[]>([]);
  const [state, setState] = useState<BillingOnboardingViewState>({
    step: 1,
    selectedPlan: null,
    trialSelected: false,
    orgId: user?.organization_id || '',
    orgName: '',
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
    loading: false,
    error: null,
    success: false
  });

  useEffect(() => {
    setTitle('Billing Onboarding');
    fetchPlans();
  }, [setTitle]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/billing/plans');
      const data = await response.json();
      if (data.plans) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    }
  };

  const handlePlanSelect = (planCode: PlanCode) => {
    setState(prev => ({ ...prev, selectedPlan: planCode }));
  };

  const handleTrialToggle = (checked: boolean) => {
    setState(prev => ({ ...prev, trialSelected: checked }));
  };

  const handleInputChange = (field: keyof BillingOnboardingViewState, value: any) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: keyof PostalAddress, value: string) => {
    setState(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleNext = () => {
    if (state.step === 1) {
      if (!state.selectedPlan) {
        toast.error('Please select a plan');
        return;
      }
      setState(prev => ({ ...prev, step: 2 }));
    }
  };

  const handleBack = () => {
    if (state.step === 2) {
      setState(prev => ({ ...prev, step: 1 }));
    }
  };

  const handleSubmit = async () => {
    if (!state.selectedPlan || !state.orgId || !state.orgName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const request: OrgOnboardRequest = {
        orgId: state.orgId,
        name: state.orgName,
        planCode: state.selectedPlan,
        trialDays: state.trialSelected ? 14 : undefined,
        website: state.website || undefined,
        industry: state.industry || undefined,
        ein: state.ein || undefined,
        tz: state.tz,
        address: Object.values(state.address).some(v => v) ? state.address : undefined
      };

      const response = await api.post('/api/billing/orgs/onboard', request as Record<string, unknown>) as OrgOnboardResponse;
      
      if (response.ok) {
        setState(prev => ({ ...prev, success: true, loading: false }));
        toast.success('Billing setup completed successfully!');
      } else {
        throw new Error((response as any).error || 'Failed to setup billing');
      }
    } catch (error) {
      console.error('Error setting up billing:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to setup billing'
      }));
      toast.error('Failed to setup billing');
    }
  };

  const renderPlanCard = (plan: PlanCatalogRow) => {
    const isSelected = state.selectedPlan === plan.plan_code;
    const price = (plan.base_price_cents / 100).toFixed(0);
    
    return (
      <Card 
        key={plan.plan_code}
        className={`cursor-pointer transition-all ${
          isSelected 
            ? 'ring-2 ring-blue-500 border-blue-500' 
            : 'hover:border-gray-300'
        }`}
        onClick={() => handlePlanSelect(plan.plan_code as PlanCode)}
      >
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            {isSelected && <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />}
            <h3 className="text-xl font-semibold">{plan.name}</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${price}
            <span className="text-sm font-normal text-gray-500">/month</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-gray-500" />
              <span>{plan.included_seats} seat{plan.included_seats !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span>{plan.included_minutes.toLocaleString()} minutes</span>
            </div>
            <div className="flex items-center text-sm">
              <MessageSquare className="h-4 w-4 mr-2 text-gray-500" />
              <span>{plan.included_sms.toLocaleString()} SMS</span>
            </div>
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 mr-2 text-gray-500" />
              <span>{plan.included_emails.toLocaleString()} emails</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your Plan
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select the plan that best fits your organization's needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(renderPlanCard)}
      </div>

      <div className="flex items-center space-x-2 justify-center">
        <Checkbox
          id="trial"
          checked={state.trialSelected}
          onCheckedChange={handleTrialToggle}
        />
        <label htmlFor="trial" className="text-sm text-gray-700 dark:text-gray-300">
          Start with a 14-day free trial
        </label>
      </div>

      {state.trialSelected && (
        <div className="max-w-2xl mx-auto mt-4 text-xs text-yellow-900 bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <strong>During your free trial</strong>, monthly plan fees are $0, but any telecom usage (voice minutes, SMS, etc.) is billed separately and due immediately. You will receive separate invoices for usage during the trial.
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!state.selectedPlan}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Business Details
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Tell us about your organization
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Organization Name *
          </label>
          <Input
            value={state.orgName}
            onChange={(e) => handleInputChange('orgName', e.target.value)}
            placeholder="Enter organization name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Website
          </label>
          <Input
            value={state.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="https://example.com"
            type="url"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Industry
          </label>
          <Input
            value={state.industry}
            onChange={(e) => handleInputChange('industry', e.target.value)}
            placeholder="e.g., Technology, Healthcare, Finance"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            EIN (Tax ID)
          </label>
          <Input
            value={state.ein}
            onChange={(e) => handleInputChange('ein', e.target.value)}
            placeholder="12-3456789"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Timezone
          </label>
          <Select value={state.tz} onValueChange={(value) => handleInputChange('tz', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">Eastern Time</SelectItem>
              <SelectItem value="America/Chicago">Central Time</SelectItem>
              <SelectItem value="America/Denver">Mountain Time</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Address (Optional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              value={state.address.street}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              placeholder="Street Address"
            />
          </div>
          <Input
            value={state.address.city}
            onChange={(e) => handleAddressChange('city', e.target.value)}
            placeholder="City"
          />
          <Input
            value={state.address.state}
            onChange={(e) => handleAddressChange('state', e.target.value)}
            placeholder="State"
          />
          <Input
            value={state.address.zip}
            onChange={(e) => handleAddressChange('zip', e.target.value)}
            placeholder="ZIP Code"
          />
          <Input
            value={state.address.country}
            onChange={(e) => handleAddressChange('country', e.target.value)}
            placeholder="Country"
          />
        </div>
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={state.loading}>
          {state.loading ? 'Setting up...' : 'Complete Setup'}
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Billing Setup Complete!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Your organization is now set up with the {state.selectedPlan} plan.
          {state.trialSelected && (
            <span className="block mt-2">
              <Badge variant="secondary">14-day free trial active</Badge>
            </span>
          )}
        </p>
      </div>

      <Button onClick={() => navigate('/organization')} size="lg">
        Go to Organization
      </Button>
    </div>
  );

  return (
    <>
      <PageMeta 
        title="Billing Onboarding" 
        description="Set up billing for your organization" 
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Billing Onboarding
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Set up billing and subscription for your organization
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            {state.success ? renderSuccess() : (
              <>
                {state.step === 1 ? renderStep1() : renderStep2()}
                
                {/* Progress indicator */}
                <div className="mt-8 flex items-center justify-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    state.step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    1
                  </div>
                  <div className={`w-16 h-1 ${state.step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    state.step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default BillingOnboarding;
