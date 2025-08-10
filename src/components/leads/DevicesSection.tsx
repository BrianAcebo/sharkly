import React from 'react';
import { Monitor, Smartphone, Tablet, Clock } from 'lucide-react';
import type { Case } from '../../types/leads';
import ComponentCard from '../common/ComponentCard';

interface DevicesSectionProps {
	devices: Case['entity']['devices'];
}

const DevicesSection: React.FC<DevicesSectionProps> = ({ devices }) => {
	const getDeviceIcon = (deviceType: string) => {
		switch (deviceType.toLowerCase()) {
			case 'desktop':
				return Monitor;
			case 'mobile':
				return Smartphone;
			case 'tablet':
				return Tablet;
			default:
				return Monitor;
		}
	};

	const formatLastUsed = (dateString: string) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	};

	return (
		<ComponentCard>
			<h3 className="mb-4 text-lg font-semibold">Connected Devices</h3>
			<div className="space-y-3">
				{devices.map((device, index) => {
					const DeviceIcon = getDeviceIcon(device.type);
					return (
						<div
							key={index}
							className="flex items-center justify-between rounded-lg bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-gray-900"
						>
							<div className="flex items-center space-x-3">
								<div className="rounded-lg bg-blue-100 p-2 dark:bg-gray-600">
									<DeviceIcon className="h-5 w-5 text-blue-600 dark:text-gray-300" />
								</div>
								<div>
									<p className="font-medium text-slate-900 dark:text-gray-300">{device.type}</p>
									<p className="text-sm text-slate-600 dark:text-gray-300">{device.os}</p>
								</div>
							</div>
							<div className="text-right">
								<div className="flex items-center space-x-1 text-sm text-slate-500 dark:text-gray-300">
									<Clock className="h-4 w-4" />
									<span>Last used</span>
								</div>
								<p className="text-sm font-medium text-slate-700 dark:text-gray-300">
									{formatLastUsed(device.lastUsed)}
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</ComponentCard>
	);
};

export default DevicesSection;
