import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  Users,
  Phone,
  MessageSquare,
  Mail
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { OrganizationRow } from '../../types/billing';

interface TrialDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialInfo: {
    isOnTrial: boolean;
    daysRemaining: number | null;
    trialEndFormatted: string | null;
    warningLevel: 'none' | 'warning' | 'danger';
    organization: OrganizationRow | null;
  };
  needsPayment: boolean;
}

export const TrialDetailsModal: React.FC<TrialDetailsModalProps> = ({
  isOpen,
  onClose,
  trialInfo,
  needsPayment
}) => {
  const navigate = useNavigate();
  
  const {
    isOnTrial,
    daysRemaining,
    trialEndFormatted,
    warningLevel,
    organization
  } = trialInfo;

  const stripeStatus = organization?.stripe_status;

  const handleUpgrade = () => {
    onClose();

    if (stripeStatus === 'canceled') {
      window.open('https://billing.stripe.com/p/login/test_fZu8wPeit9J33Yu4Kb2go00', '_blank');
      return;
    }

    navigate('/billing');
  };

  const getIcon = () => {
    if (needsPayment) {
      return <CreditCard className="h-6 w-6 text-red-600" />;
    }
    if (warningLevel === 'danger') {
      return <AlertTriangle className="h-6 w-6 text-red-600" />;
    } else if (warningLevel === 'warning') {
      return <Clock className="h-6 w-6 text-amber-600" />;
    }
    return <CheckCircle className="h-6 w-6 text-green-600" />;
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

  const getStatusText = () => {
    if (needsPayment) {
      return 'Payment Method Required';
    }
    if (isOnTrial) {
      return '7‑Day Pay‑As‑You‑Go Trial Active';
    }
    return 'Subscription Status';
  };

  const getStatusMessage = () => {
    if (needsPayment) {
      return 'You need to add a payment method to continue using your account. Your trial has ended and features are now limited.';
    }
    if (isOnTrial) {
      if (daysRemaining !== null) {
        if (daysRemaining === 0) {
          return 'Your trial ends today.';
        } else if (daysRemaining === 1) {
          return 'Your trial ends tomorrow.';
        } else {
          return `Your trial ends in ${daysRemaining} days.`;
        }
      }
      return 'You are currently on a 7‑day pay‑as‑you‑go trial.';
    }
    return 'You have an active subscription.';
  };

  const getCurrentPlan = () => {
    if (organization?.plan_code) {
      const planName = organization.plan_code.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      return planName;
    }
    return '7‑Day Trial';
  };

  const getPlanFeatures = () => {
    const features = [
      { icon: <Users className="h-4 w-4" />, text: `${organization?.included_seats || 1} team member${(organization?.included_seats || 1) > 1 ? 's' : ''}` },
      { icon: <Phone className="h-4 w-4" />, text: `${organization?.included_minutes || 0} calling minutes` },
      { icon: <MessageSquare className="h-4 w-4" />, text: `${organization?.included_sms || 0} SMS messages` },
      { icon: <Mail className="h-4 w-4" />, text: `${organization?.included_emails || 0} emails` }
    ];
    return features;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getIcon()}
            <span>{getStatusText()}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Card */}
          <Card className={getCardStyles()}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${getTextStyles()}`}>
                  {getStatusText()}
                </h3>
                <p className={`text-sm ${getTextStyles()}`}>
                  {getStatusMessage()}
                </p>
                {trialEndFormatted && !needsPayment && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span className={getTextStyles()}>
                      Trial ends: {trialEndFormatted}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Plan Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Plan: {getCurrentPlan()}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {getPlanFeatures().map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  {feature.icon}
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>

            {organization?.plan_price_cents && (
              <div className="flex items-center space-x-2 text-sm font-medium">
                <DollarSign className="h-4 w-4" />
                <span>${(organization.plan_price_cents / 100).toFixed(2)}/month</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              onClick={handleUpgrade}
              className={
                needsPayment || warningLevel === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
            >
              {needsPayment ? 'Add Payment Method' : 'Upgrade Plan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrialDetailsModal;
