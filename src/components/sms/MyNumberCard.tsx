import React from 'react';
import { Phone } from 'lucide-react';
import MyNumberBadge from './MyNumberBadge';

interface MyNumberCardProps {
  onNumberChange?: (phoneNumber: string) => void;
}

const MyNumberCard: React.FC<MyNumberCardProps> = ({ onNumberChange }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          My Business Number
        </h3>
        <Phone className="h-5 w-5 text-brand-500" />
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Auto-Provisioned Number
              </p>
              <MyNumberBadge onNumberChange={onNumberChange} />
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your business number is automatically provisioned for your seat and used for all SMS communications with leads.
        </p>
      </div>
    </div>
  );
};

export default MyNumberCard;
