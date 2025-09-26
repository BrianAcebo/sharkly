import { useMemo } from 'react';
import { useOrganization } from './useOrganization';
import { getTrialStatus, getTrialStatusMessage, isTrialEndingSoon, getTrialWarningLevel, shouldBlockApp, needsPaymentMethod, TrialStatus } from '../utils/trialUtils';

export function useTrial() {
  const { organization, loading, error } = useOrganization();

  const trialInfo = useMemo((): TrialStatus & {
    statusMessage: string;
    isEndingSoon: boolean;
    warningLevel: 'none' | 'warning' | 'danger';
    organization: any;
    loading: boolean;
    error: string | null;
    shouldBlockApp: boolean;
    needsPayment: boolean;
  } => {
    if (loading) {
      return {
        isOnTrial: false,
        trialEndDate: null,
        daysRemaining: null,
        isExpired: false,
        trialEndFormatted: null,
        statusMessage: 'Loading...',
        isEndingSoon: false,
        warningLevel: 'none',
        organization: null,
        loading: true,
        error: null,
        shouldBlockApp: false,
        needsPayment: false
      };
    }

    if (error || !organization) {
      return {
        isOnTrial: false,
        trialEndDate: null,
        daysRemaining: null,
        isExpired: false,
        trialEndFormatted: null,
        statusMessage: error || 'No organization found.',
        isEndingSoon: false,
        warningLevel: 'none',
        organization: null,
        loading: false,
        error,
        shouldBlockApp: false,
        needsPayment: false
      };
    }

    const status = getTrialStatus(organization);
    const statusMessage = getTrialStatusMessage(organization);
    const isEndingSoon = isTrialEndingSoon(organization);
    const warningLevel = getTrialWarningLevel(organization);
    const needsPayment = needsPaymentMethod(organization);
    const stripeStatus = organization?.stripe_status;
    const hasStripeStatus = typeof stripeStatus === 'string';

    const shouldBlock = shouldBlockApp(organization, hasStripeStatus);
    const adjustedNeedsPayment = stripeStatus === 'canceled' ? false : needsPayment;

    return {
      ...status,
      statusMessage,
      isEndingSoon,
      warningLevel,
      organization,
      loading: false,
      error: null,
      shouldBlockApp: shouldBlock,
      needsPayment: adjustedNeedsPayment
    };
  }, [organization, loading, error]);

  return trialInfo;
}
