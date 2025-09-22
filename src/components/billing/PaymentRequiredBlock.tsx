import React from 'react';
import { CreditCard, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { isOrganizationBehindOnPayments, getOrganizationStatusMessage } from '../../utils/paymentStatus';

interface PaymentRequiredBlockProps {
  children: React.ReactNode;
  organization?: any; // OrganizationRow type
  onUpdatePayment?: () => void;
  showBanner?: boolean;
}

export default function PaymentRequiredBlock({ 
  children, 
  organization, 
  onUpdatePayment,
  showBanner = true 
}: PaymentRequiredBlockProps) {
  const { paymentStatus, isLoading } = usePaymentStatus();
  
  // Use provided organization or payment status organization
  const org = organization || paymentStatus?.organization;
  
  if (isLoading || !org) {
    return <>{children}</>;
  }

  const isBehindOnPayments = isOrganizationBehindOnPayments(org);
  const statusMessage = getOrganizationStatusMessage(org);

  if (!isBehindOnPayments) {
    return <>{children}</>;
  }

  const handleUpdatePayment = () => {
    if (onUpdatePayment) {
      onUpdatePayment();
    } else {
      // Default action - redirect to billing page
      window.location.href = '/billing';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Payment Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              {statusMessage}
            </p>
            {org.payment_failure_reason && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Reason: {org.payment_failure_reason}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleUpdatePayment}
              className="w-full"
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Update Payment Method
            </Button>
            
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
              Once payment is updated, your organization will be automatically restored to full access.
            </p>
          </div>

          {org.payment_retry_count && org.payment_retry_count > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Retry Attempt {org.payment_retry_count}:</strong> We've attempted to charge your payment method multiple times. 
                Please update your payment information to avoid service interruption.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
