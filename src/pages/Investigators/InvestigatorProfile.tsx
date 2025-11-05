import * as React from 'react';
import PageMeta from '../../components/common/PageMeta';
import ComponentCard from '../../components/common/ComponentCard';
import { UserAvatar } from '../../components/common/UserAvatar';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Button } from '../../components/ui/button';

export default function InvestigatorProfile() {
  const { user } = useAuth();

  const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.email || 'Your Profile';

  return (
    <div>
      <PageMeta title="My Profile" description="Your investigator profile" />
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">My Profile</h1>

        <ComponentCard>
          <div className="flex items-start gap-4">
            <UserAvatar user={{ name: fullName, avatar: user?.avatar ?? null }} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">{fullName}</h2>
                {user?.role && <Badge variant="secondary" className="capitalize">{user.role}</Badge>}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{user?.email}</p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs uppercase text-gray-500">Organization</div>
                  <div className="text-sm">{user?.organization?.name || user?.organization_id || '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-500">Title</div>
                  <div className="text-sm">{user?.title || '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-500">Phone</div>
                  <div className="text-sm">{user?.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-500">Location</div>
                  <div className="text-sm">{user?.location || '—'}</div>
                </div>
              </div>
              {user?.bio && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <div className="text-xs uppercase text-gray-500">Bio</div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{user.bio}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <Button asChild variant="outline"><a href="/settings">Edit Settings</a></Button>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}


