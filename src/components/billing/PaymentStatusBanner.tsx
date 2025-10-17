import React from 'react';
import { AlertTriangle, CreditCard, Clock, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { isOrganizationBehindOnPayments, getOrganizationStatusMessage, getOrganizationStatusColor } from '../../utils/paymentStatus';

interface PaymentStatusBannerProps {
  organization?: any; // OrganizationRow type
  onUpdatePayment?: () => void;
  className?: string;
}

export default function PaymentStatusBanner({ 
  organization, 
  onUpdatePayment, 
  className = '' 
}: PaymentStatusBannerProps) {
  const { paymentStatus, isLoading } = usePaymentStatus();
  
  // Use provided organization or payment status organization
  const org = organization || paymentStatus?.organization;
  
  if (isLoading || !org) {
    return null;
  }

  const isBehindOnPayments = isOrganizationBehindOnPayments(org);
  const statusMessage = getOrganizationStatusMessage(org);
  const statusColor = getOrganizationStatusColor(org);

  if (!isBehindOnPayments) {
    return null;
  }

  const getStatusIcon = () => {
    switch (org.org_status) {
      case 'payment_required':
        return <CreditCard className="h-5 w-5" />;
      case 'past_due':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <XCircle className="h-5 w-5" />;
    }
  };

  const getStatusColorClasses = () => {
    switch (statusColor) {
      case 'red':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'orange':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'green':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getActionButton = () => {
    if (org.org_status === 'payment_required' || org.org_status === 'past_due') {
      return (
        <Button
          onClick={onUpdatePayment}
          size="sm"
          className="ml-3"
        >
          <CreditCard className="h-4 w-4 mr-1" />
          Update Payment
        </Button>
      );
    }
    return null;
  };

  const getRetryInfo = () => {
    if (org.payment_retry_count && org.payment_retry_count > 0) {
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          <Clock className="h-4 w-4 inline mr-1" />
          Retry attempt {org.payment_retry_count}
          {org.next_payment_retry_at && (
            <span className="ml-2">
              Next retry: {new Date(org.next_payment_retry_at).toLocaleDateString()}
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={`border-l-4 ${getStatusColorClasses()} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              {getStatusIcon()}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">
                Payment Issue Detected
              </h3>
              <p className="text-sm mt-1">
                {statusMessage}
              </p>
              {org.payment_failure_reason && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Reason: {org.payment_failure_reason}
                </p>
              )}
              {getRetryInfo()}
            </div>
          </div>
          {getActionButton()}
        </div>
      </CardContent>
    </Card>
  );
}
