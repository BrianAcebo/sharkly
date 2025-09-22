import React, { useState } from 'react';
import { useTrial } from '../../hooks/useTrial';
import { needsPaymentMethod } from '../../utils/featureGating';
import { Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { TrialDetailsModal } from './TrialDetailsModal';

interface TrialBannerProps {
  className?: string;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ className = '' }) => {
  const trialInfo = useTrial();
  const [showModal, setShowModal] = useState(false);
  
  const {
    isOnTrial,
    daysRemaining,
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
      return <CreditCard className="h-4 w-4" />;
    }
    if (warningLevel === 'danger') {
      return <AlertTriangle className="h-4 w-4" />;
    } else if (warningLevel === 'warning') {
      return <Clock className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getBannerStyles = () => {
    if (needsPayment || warningLevel === 'danger') {
      return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
    } else if (warningLevel === 'warning') {
      return 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200';
    }
    return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
  };

  const getBannerText = () => {
    if (needsPayment) {
      return 'Payment method required to continue using your account';
    }
    if (daysRemaining !== null) {
      if (daysRemaining === 0) {
        return 'Your trial ends today';
      } else if (daysRemaining === 1) {
        return 'Your trial ends tomorrow';
      } else if (daysRemaining <= 3) {
        return `Your trial ends in ${daysRemaining} days`;
      } else {
        return `Your trial ends in ${daysRemaining} days`;
      }
    }
    return 'Your trial is active';
  };

  return (
    <>
      <div className={`w-full border-b text-gray-100 border-green-200 px-4 py-2 ${getBannerStyles()} ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <span className="text-sm font-medium">
              {getBannerText()}
            </span>
          </div>
          
          <Button
            onClick={() => setShowModal(true)}
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs hover:bg-current/10"
          >
            View Details
          </Button>
        </div>
      </div>

      <TrialDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        trialInfo={trialInfo}
        needsPayment={needsPayment}
      />
    </>
  );
};

export default TrialBanner;
