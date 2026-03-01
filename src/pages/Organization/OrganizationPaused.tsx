import { useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Pause, CreditCard, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOrganizationStatus } from '../../hooks/useOrganizationStatus';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { useNavigate } from 'react-router-dom';

interface OrganizationPausedProps {
  reason?: 'paused' | 'payment_required';
  onResume?: () => void;
}

export default function OrganizationPaused({ reason = 'paused' }: OrganizationPausedProps) {
  const { user } = useAuth();
  const { isLoading } = useOrganizationStatus();
  const navigate = useNavigate();
  const { setTitle } = useBreadcrumbs();

  useEffect(() => {
    setTitle('Organization Paused');
  }, [setTitle]);

  // Manual resume disabled

  const handleManageBilling = () => {
    navigate('/billing');
  };

  const getContent = () => {
    if (reason === 'payment_required') {
      return {
        icon: <CreditCard className="h-16 w-16 text-red-500" />,
        title: 'Payment Required',
        subtitle: 'Your organization has been paused due to a failed payment',
        description: 'Please update your payment method to resume your organization and continue using all features.',
        primaryAction: {
          text: 'Update Payment Method',
          onClick: handleManageBilling,
          variant: 'default' as const,
          icon: <CreditCard className="h-4 w-4 mr-2" />
        },
        secondaryAction: {
          text: 'Contact Support',
          onClick: () => window.open('mailto:support@truesightintel.com', '_blank'),
          variant: 'outline' as const
        }
      };
    }

    return {
      icon: <Pause className="h-16 w-16 text-orange-500" />,
      title: 'Organization Paused',
      subtitle: 'Your organization has been paused',
      description: 'All features are currently in read-only mode.',
      primaryAction: {
        text: 'Manage Billing',
        onClick: handleManageBilling,
        variant: 'default' as const
      },
      secondaryAction: {
        text: 'Manage Billing',
        onClick: handleManageBilling,
        variant: 'outline' as const,
        icon: <CreditCard className="h-4 w-4 mr-2" />
      }
    };
  };

  const content = getContent();

  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-lg">
            {content.icon}
          </div>
          
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {content.title}
          </h1>
          
          <p className="mt-2 text-lg font-medium text-gray-600 dark:text-gray-400">
            {content.subtitle}
          </p>
          
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {content.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={content.primaryAction.onClick}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span className="text-gray-700 dark:text-gray-100">Processing...</span>
              </div>
            ) : (
              <>
                {content.primaryAction.icon}
                {content.primaryAction.text}
              </>
            )}
          </Button>

          <Button
            onClick={content.secondaryAction.onClick}
            variant={content.secondaryAction.variant}
            className="w-full"
            size="lg"
          >
            {content.secondaryAction.icon}
            {content.secondaryAction.text}
          </Button>
        </div>

        {/* Additional Info */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Need Help?
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  If you're having trouble with your organization or need assistance, 
                  please contact our support team.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Organization Info */}
        {user?.organization_id && (
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Organization ID: {user.organization_id}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
