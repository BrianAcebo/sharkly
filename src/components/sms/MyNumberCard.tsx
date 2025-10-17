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
        <p className="text-sm text-gray-600 dark:text-gray-400">
          SMS number provisioning is currently managed by the Paperboat team. Contact support if you need changes.
        </p>
      </div>
    </div>
  );
};

export default MyNumberCard;
