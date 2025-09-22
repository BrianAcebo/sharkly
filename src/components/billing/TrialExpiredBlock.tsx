import React from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, CreditCard, Lock, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface TrialExpiredBlockProps {
  trialInfo: {
    daysRemaining: number | null;
    trialEndFormatted: string | null;
    organization: {
      plan_code?: string;
      included_seats?: number;
      included_minutes?: number;
      included_sms?: number;
      included_emails?: number;
    } | null;
  };
  needsPayment: boolean;
}

export const TrialExpiredBlock: React.FC<TrialExpiredBlockProps> = ({
  trialInfo,
  needsPayment
}) => {
  const navigate = useNavigate();
  
  const {
    daysRemaining,
    trialEndFormatted,
    organization
  } = trialInfo;

  const handleUpgrade = () => {
    navigate('/billing');
  };

  const getStatusInfo = () => {
    if (needsPayment) {
      return {
        icon: <CreditCard className="h-8 w-8 text-red-600" />,
        title: 'Payment Method Required',
        description: 'Your trial has ended and you need to add a payment method to continue using your account.',
        actionText: 'Add Payment Method',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800'
      };
    } else if (daysRemaining === 0) {
      return {
        icon: <AlertTriangle className="h-8 w-8 text-red-600" />,
        title: 'Trial Ended Today',
        description: 'Your free trial has ended today.',
        actionText: 'View Billing',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800'
      };
    } else if (daysRemaining !== null && daysRemaining < 0) {
      return {
        icon: <Lock className="h-8 w-8 text-red-600" />,
        title: 'Trial Expired',
        description: `Your free trial ended ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago.`,
        actionText: 'View Billing',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800'
      };
    } else if (daysRemaining !== null) {
      return {
        icon: <Calendar className="h-8 w-8 text-amber-600" />,
        title: 'Trial Ending Soon',
        description: `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
        actionText: 'View Billing',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800'
      };
    } else {
      return {
        icon: <Calendar className="h-8 w-8 text-amber-600" />,
        title: 'Trial Status Unknown',
        description: 'Unable to determine trial status. Please contact support.',
        actionText: 'Contact Support',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800'
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {statusInfo.icon}
            </div>
            <CardTitle className={`text-xl font-bold ${statusInfo.textColor}`}>
              {statusInfo.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className={`text-sm ${statusInfo.textColor} mb-4`}>
                {statusInfo.description}
              </p>
              
              {trialEndFormatted && (
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>Trial ended: {trialEndFormatted}</span>
                </div>
              )}
            </div>

            {/* Current Plan Info */}
            {organization && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Current Plan: {organization.plan_code ? organization.plan_code.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Free Trial'}
                </h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>Team members: {organization.included_seats || 1}</div>
                  <div>Calling minutes: {organization.included_minutes || 0}</div>
                  <div>SMS messages: {organization.included_sms || 0}</div>
                  <div>Emails: {organization.included_emails || 0}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleUpgrade}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                {statusInfo.actionText}
              </Button>
              
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Need help? Contact our support team for assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrialExpiredBlock;
