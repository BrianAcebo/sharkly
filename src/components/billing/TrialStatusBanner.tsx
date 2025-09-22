import React from 'react';
import { useTrial } from '../../hooks/useTrial';
import { needsPaymentMethod } from '../../utils/featureGating';
import { AlertTriangle, Clock, CheckCircle, CreditCard } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface TrialStatusBannerProps {
  onUpgrade?: () => void;
  showUpgradeButton?: boolean;
  className?: string;
}

export const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({
  onUpgrade,
  showUpgradeButton = true,
  className = ''
}) => {
  const trialInfo = useTrial();
  const {
    isOnTrial,
    daysRemaining,
    trialEndFormatted,
    statusMessage,
    isEndingSoon,
    warningLevel,
    loading
  } = trialInfo;

  const needsPayment = needsPaymentMethod(trialInfo.organization);

  // Don't show banner if loading, not on trial, and doesn't need payment method
  if (loading || (!isOnTrial && !needsPayment)) {
    return null;
  }

  const getIcon = () => {
    if (needsPayment) {
      return <CreditCard className="h-5 w-5 text-red-600" />;
    }
    if (warningLevel === 'danger') {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    } else if (warningLevel === 'warning') {
      return <Clock className="h-5 w-5 text-amber-600" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  const getCardStyles = () => {
    if (needsPayment || warningLevel === 'danger') {
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
    } else if (warningLevel === 'warning') {
      return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20';
    }
    return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
  };

  const getTextStyles = () => {
    if (needsPayment || warningLevel === 'danger') {
      return 'text-red-800 dark:text-red-200';
    } else if (warningLevel === 'warning') {
      return 'text-amber-800 dark:text-amber-200';
    }
    return 'text-green-800 dark:text-green-200';
  };

  return (
    <Card className={`${getCardStyles()} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <div>
              <h3 className={`text-sm font-medium ${getTextStyles()}`}>
                {needsPayment ? 'Payment Method Required' : 'Free Trial Active'}
              </h3>
              <p className={`text-sm ${getTextStyles()}`}>
                {statusMessage}
              </p>
              {trialEndFormatted && !needsPayment && (
                <p className={`text-xs ${getTextStyles()} opacity-75`}>
                  Trial ends: {trialEndFormatted}
                </p>
              )}
            </div>
          </div>
          
          {showUpgradeButton && onUpgrade && (
            <Button
              onClick={onUpgrade}
              size="sm"
              variant={needsPayment || warningLevel === 'danger' ? 'default' : 'outline'}
              className={
                needsPayment || warningLevel === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : ''
              }
            >
              {needsPayment ? 'Add Payment Method' : (isEndingSoon ? 'Upgrade Now' : 'Upgrade')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrialStatusBanner;
