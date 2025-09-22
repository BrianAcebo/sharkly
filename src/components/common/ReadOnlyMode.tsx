import React from 'react';
import { AlertTriangle, Pause, Shield, CreditCard, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface ReadOnlyModeProps {
  children: React.ReactNode;
  isReadOnly: boolean;
  reason?: 'paused' | 'disabled' | 'trial_expired' | 'payment_required' | 'past_due';
  onResume?: () => void;
  className?: string;
  showResumeButton?: boolean;
  paymentFailureReason?: string;
}

export const ReadOnlyMode: React.FC<ReadOnlyModeProps> = ({
  children,
  isReadOnly,
  reason = 'paused',
  onResume,
  className = '',
  showResumeButton = false,
  paymentFailureReason
}) => {
  if (!isReadOnly) {
    return <>{children}</>;
  }

  const getReasonInfo = () => {
    switch (reason) {
      case 'paused':
        return {
          icon: <Pause className="h-5 w-5" />,
          title: 'Organization Paused',
          message: 'This organization has been paused. All features are in read-only mode.',
          showResume: showResumeButton,
          showManageSubscription: true
        };
      case 'disabled':
        return {
          icon: <Shield className="h-5 w-5" />,
          title: 'Organization Disabled',
          message: 'This organization has been disabled. Contact support for assistance.',
          showResume: false,
          showManageSubscription: false
        };
      case 'payment_required':
        return {
          icon: <CreditCard className="h-5 w-5" />,
          title: 'Payment Action Required',
          message: 'Payment action is required. Please update your payment method to continue using the service.',
          showResume: false,
          showManageSubscription: true
        };
      case 'past_due':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: 'Payment Past Due',
          message: 'Your payment is past due. Please update your payment method to restore full access.',
          showResume: false,
          showManageSubscription: true
        };
      case 'trial_expired':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: 'Trial Expired',
          message: 'Your trial has expired. Please upgrade to continue using all features.',
          showResume: false,
          showManageSubscription: true
        };
      default:
        return {
          icon: <Pause className="h-5 w-5" />,
          title: 'Read-Only Mode',
          message: 'This organization is in read-only mode.',
          showResume: false,
          showManageSubscription: true
        };
    }
  };

  const handleManageSubscription = () => {
    window.open('https://billing.stripe.com/p/login/test_fZu8wPeit9J33Yu4Kb2go00', '_blank');
  };

  const reasonInfo = getReasonInfo();

  return (
    <div className={`relative ${className}`}>
      {/* Read-only overlay */}
      <div className="absolute inset-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex h-full items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                {reasonInfo.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {reasonInfo.title}
              </h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {reasonInfo.message}
              </p>
              {paymentFailureReason && (reason === 'payment_required' || reason === 'past_due') && (
                <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Reason:</strong> {paymentFailureReason}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                {reasonInfo.showResume && onResume && (
                  <Button
                    onClick={onResume}
                    variant="default"
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume Organization
                  </Button>
                )}
                {reasonInfo.showManageSubscription && (
                  <Button
                    onClick={handleManageSubscription}
                    variant="outline"
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-sm">
        {children}
      </div>
    </div>
  );
};

export default ReadOnlyMode;
