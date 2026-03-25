/**
 * GSC Property Selection Page
 * User selects which GSC property to connect after OAuth succeeds
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { api } from '../utils/api';

interface GSCProperty {
	siteUrl: string;
	permissionLevel: string;
}

export default function GSCSelectProperty() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const siteId = searchParams.get('siteId');
	const cacheKey = searchParams.get('cacheKey');

	const [loading, setLoading] = useState(true);
	const [properties, setProperties] = useState<GSCProperty[]>([]);
	const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch properties from backend cache
	useEffect(() => {
		const fetchProperties = async () => {
			try {
				if (!siteId || !cacheKey) {
					throw new Error('Missing siteId or cacheKey');
				}

				// Call backend to get properties from cache
				const res = await api.get(`/api/gsc/properties?cacheKey=${encodeURIComponent(cacheKey)}`);

				if (!res.ok) {
					throw new Error('Failed to fetch GSC properties');
				}

				const data = (await res.json()) as { properties: GSCProperty[] };
				setProperties(data.properties);

				if (data.properties.length > 0) {
					setSelectedProperty(data.properties[0].siteUrl);
				}

				setLoading(false);
			} catch (err) {
				console.error('Error fetching properties:', err);
				setError(err instanceof Error ? err.message : 'Failed to fetch properties');
				setLoading(false);
			}
		};

		fetchProperties();
	}, [siteId, cacheKey]);

	const handleSave = async () => {
		if (!selectedProperty) {
			toast.error('Please select a property');
			return;
		}

		if (!cacheKey) {
			toast.error('Session expired. Please try again.');
			return;
		}

		try {
			setSaving(true);

			const res = await api.post('/api/gsc/save', {
				gscPropertyUrl: selectedProperty,
				cacheKey
			});

			if (!res.ok) {
				const errorData = (await res.json()) as { error?: string };
				throw new Error(errorData.error || 'Failed to save GSC connection');
			}

			toast.success('Google Search Console connected!');
			navigate('/sites');
		} catch (err) {
			console.error('Error saving:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to save');
			setSaving(false);
		}
	};

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
						<AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
					</div>
					<h2 className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
						Error
					</h2>
					<p className="mb-6 text-center text-gray-600 dark:text-gray-400">{error}</p>
					<Button onClick={() => navigate('/sites')} className="w-full">
						Back to Sites
					</Button>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-gray-600 dark:text-gray-400" />
					<h1 className="text-lg font-semibold text-gray-900 dark:text-white">
						Loading GSC properties...
					</h1>
				</div>
			</div>
		);
	}

	if (properties.length === 0) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
						<AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
					</div>
					<h2 className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
						No Properties Found
					</h2>
					<p className="mb-6 text-center text-gray-600 dark:text-gray-400">
						No Google Search Console properties are associated with your connected Google account. 
						Please add properties to your Google Search Console and try again.
					</p>
					<Button onClick={() => navigate('/sites')} className="w-full">
						Back to Sites
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
			<div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
				<h2 className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
					Select Search Console Property
				</h2>
				<p className="mb-6 text-center text-sm text-gray-600 dark:text-gray-400">
					Choose which property to connect to this site.
				</p>

				<div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
					{properties.map((prop) => {
						// Format the URL: remove sc-domain: prefix if present
						const displayUrl = prop.siteUrl.startsWith('sc-domain:')
							? prop.siteUrl.replace('sc-domain:', '')
							: prop.siteUrl;

						// Format permission level: convert camelCase to Title Case
						const displayPermission = prop.permissionLevel
							.replace(/([A-Z])/g, ' $1')
							.replace(/^./, (str) => str.toUpperCase())
							.trim();

						return (
							<button
								key={prop.siteUrl}
								onClick={() => setSelectedProperty(prop.siteUrl)}
								className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
									selectedProperty === prop.siteUrl
										? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
										: 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
								}`}
							>
								<p className="text-sm font-medium text-gray-900 dark:text-white">
									{displayUrl}
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									{displayPermission}
								</p>
							</button>
						);
					})}
				</div>

				<div className="flex gap-3">
					<Button
						variant="outline"
						onClick={() => navigate('/sites')}
						disabled={saving}
						className="flex-1"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={!selectedProperty || saving}
						className="flex-1"
					>
						{saving ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Saving...
							</>
						) : (
							'Connect'
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
