import React from 'react';
import { Building2, Globe, MapPin, CreditCard } from 'lucide-react';
import ComponentCard from '../common/ComponentCard';
import { BusinessRecord } from '../../types/business';
import { UserAvatar } from '../common/UserAvatar';

export default function BusinessProfile({ business }: { business: BusinessRecord }) {
  if (!business) return null;

  const officersCount = Array.isArray(business.officers) ? business.officers.length : 0;
  const domainsCount = Array.isArray(business.domains) ? business.domains.length : 0;
  const addressesCount = Array.isArray(business.addresses) ? business.addresses.length : 0;

  // Try to show up to 3 domains if they look like strings; otherwise just counts
  const domainPreview: string[] = Array.isArray(business.domains)
    ? (business.domains as unknown[])
        .map((d) => (typeof d === 'string' ? d : (d as { name?: string; url?: string })?.name || (d as { url?: string }).url))
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .slice(0, 3)
    : [];

  return (
    <ComponentCard>
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <UserAvatar
            user={{
              name: business.name,
              avatar: business.avatar ?? null
            }}
            size="lg"
          />
          <div>
            <h2 className="text-lg font-bold">{business.name}</h2>
            <p className="text-gray-600 dark:text-gray-300">business</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">ID: {business.id}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {business.ein_tax_id && (
          <div className="flex items-start space-x-3 rounded-lg p-3">
            <CreditCard className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">EIN / Tax ID</p>
              <p>{business.ein_tax_id}</p>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-3 rounded-lg p-3">
          <MapPin className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Addresses</p>
            <p>{addressesCount > 0 ? `${addressesCount} known` : '-'}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 rounded-lg p-3">
          <Globe className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Domains</p>
            {domainPreview.length > 0 ? (
              <p className="text-sm">
                {domainPreview.join(', ')}
                {domainsCount > domainPreview.length ? ` (+${domainsCount - domainPreview.length} more)` : ''}
              </p>
            ) : (
              <p>{domainsCount > 0 ? `${domainsCount} known` : '-'}</p>
            )}
          </div>
        </div>

        <div className="flex items-start space-x-3 rounded-lg p-3">
          <Building2 className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Officers</p>
            <p>{officersCount > 0 ? `${officersCount} person${officersCount === 1 ? '' : 's'}` : '-'}</p>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}


