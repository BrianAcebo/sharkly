import React, { useState, useEffect } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { smsApi } from '../../lib/api';

interface MyNumberBadgeProps {
  onNumberChange?: (phoneNumber: string) => void;
  className?: string;
}

const MyNumberBadge: React.FC<MyNumberBadgeProps> = ({ onNumberChange, className = '' }) => {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const maxPollingAttempts = 12; // 60 seconds total (5s intervals)

  // Format phone number for display
  const formatPhoneNumber = (phone: string): string => {
    // Remove +1 prefix and format as (XXX) XXX-XXXX
    const clean = phone.replace(/^\+1/, '').replace(/\D/g, '');
    if (clean.length === 10) {
      return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
    return phone; // Return as-is if not 10 digits
  };

  const fetchMyNumber = async () => {
    try {
      setIsLoading(true);
      
      const response = await smsApi.getMyNumber();
      setPhoneNumber(response.phoneNumber);
      
      if (response.phoneNumber && onNumberChange) {
        onNumberChange(response.phoneNumber);
      }
      
      // Reset polling if we got a number
      if (response.phoneNumber) {
        setPollingAttempts(0);
      }
      
    } catch (err) {
      console.error('Failed to fetch phone number:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMyNumber();
  }, []);

  // Polling for number provisioning
  useEffect(() => {
    if (phoneNumber || pollingAttempts >= maxPollingAttempts) return;

    const interval = setInterval(() => {
      setPollingAttempts(prev => prev + 1);
      fetchMyNumber();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [phoneNumber, pollingAttempts]);

  const handleRetry = () => {
    setPollingAttempts(0);
    fetchMyNumber();
  };

  if (isLoading && !phoneNumber) {
    return (
      <div className={`flex items-center space-x-2 text-gray-600 dark:text-gray-400 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (phoneNumber) {
    return (
      <div className={`flex items-center space-x-2 text-green-700 dark:text-green-400 ${className}`}>
        <Phone className="h-4 w-4" />
        <span className="text-sm font-medium">{formatPhoneNumber(phoneNumber)}</span>
      </div>
    );
  }

  if (pollingAttempts >= maxPollingAttempts) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 dark:text-red-400 ${className}`}>
        <Phone className="h-4 w-4" />
        <span className="text-sm">Number not available</span>
        <button
          onClick={handleRetry}
          className="text-xs underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-yellow-600 dark:text-yellow-400 ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">
        Provisioning your business number... ({pollingAttempts * 5}s)
      </span>
    </div>
  );
};

export default MyNumberBadge;
