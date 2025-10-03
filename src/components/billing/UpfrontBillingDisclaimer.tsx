import React from 'react';

export default function UpfrontBillingDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 ${className}`}>
      <p className="leading-relaxed">
        By continuing, you agree that Paperboat CRM charges the subscription up front and uses a prepaid usage wallet for
        calls, SMS, and emails. When the wallet balance is low or empty, you may be prompted to make a one‑time deposit to
        refill your wallet. This helps prevent fraud and service interruptions. Taxes may apply.
      </p>
    </div>
  );
}


