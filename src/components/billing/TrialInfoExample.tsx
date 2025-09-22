import React from 'react';
import { useTrial } from '../../hooks/useTrial';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Example component showing how to use trial information
 * This can be used in any component to display trial status
 */
export const TrialInfoExample: React.FC = () => {
  const {
    isOnTrial,
    daysRemaining,
    trialEndFormatted,
    statusMessage,
    isEndingSoon,
    warningLevel
  } = useTrial();

  if (!isOnTrial) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Subscription Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No active trial found.</p>
        </CardContent>
      </Card>
    );
  }

  const getBadgeVariant = () => {
    if (warningLevel === 'danger') return 'destructive';
    if (warningLevel === 'warning') return 'secondary';
    return 'default';
  };

  const getIcon = () => {
    if (warningLevel === 'danger') {
      return <AlertTriangle className="h-4 w-4" />;
    } else if (warningLevel === 'warning') {
      return <Clock className="h-4 w-4" />;
    }
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <span>Free Trial Status</span>
          </div>
          <Badge variant={getBadgeVariant()}>
            {isEndingSoon ? 'Ending Soon' : 'Active'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">{statusMessage}</p>
        
        {daysRemaining !== null && (
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm">
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
            </span>
          </div>
        )}
        
        {trialEndFormatted && (
          <div className="text-xs text-gray-500">
            Trial ends: {trialEndFormatted}
          </div>
        )}
        
        {isEndingSoon && (
          <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Your trial is ending soon. Consider upgrading to continue using all features.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrialInfoExample;
