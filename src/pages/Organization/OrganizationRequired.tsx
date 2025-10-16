import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import SeamlessBillingFlow from '../../components/billing/SeamlessBillingFlow';
import UpfrontBillingDisclaimer from '../../components/billing/UpfrontBillingDisclaimer';
export default function OrganizationRequired() {
    const [showSeamlessBilling, setShowSeamlessBilling] = useState(false);
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Organization Required');
	}, [setTitle]);

	if (showSeamlessBilling) {
		return <SeamlessBillingFlow onClose={() => setShowSeamlessBilling(false)} />;
	}

    return (
        <div className="flex h-full flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-900">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Organization Required
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        You need to be part of an organization to use this feature.
                    </p>
                    <Button size="sm" onClick={() => setShowSeamlessBilling(true)} className="mx-auto mt-6 w-40">
                        Get Started
                    </Button>
                </div>

                <div className="space-y-6">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Already have an invitation?{' '}
                        <a
                            href="#"
                            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                        >
                            Check your email
                        </a>
                    </p>
                    <UpfrontBillingDisclaimer />
                </div>
            </div>
        </div>
    );
}
