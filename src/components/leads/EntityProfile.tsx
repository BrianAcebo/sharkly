import React from 'react';
import { Mail, MapPin } from 'lucide-react';
import type { Case } from '../../types/leads';
import ComponentCard from '../common/ComponentCard';

interface EntityProfileProps {
	entity: Case['entity'];
}

const EntityProfile: React.FC<EntityProfileProps> = ({ entity }) => {
	return (
		<ComponentCard>
			<div className="mb-6 flex items-center space-x-4">
				<img
					src={entity.avatar}
					alt={entity.name}
					className="h-16 w-16 rounded-full border-2 border-gray-200 dark:border-gray-600"
				/>
				<div>
					<h2 className="text-lg font-bold">{entity.name}</h2>
					<p className="text-gray-600 capitalize dark:text-gray-300">{entity.type}</p>
					<p className="text-sm text-gray-600 dark:text-gray-300">ID: {entity.id}</p>
				</div>
			</div>

			<div className="space-y-4">
				<div className="flex items-start space-x-3 rounded-lg p-3">
					<Mail className="h-5 w-5" />
					<div>
						<p className="text-sm font-medium text-gray-600 dark:text-gray-300">Email Address</p>
						<p>{entity.email}</p>
					</div>
				</div>

				<div className="flex items-start space-x-3 rounded-lg p-3">
					<MapPin className="h-5 w-5" />
					<div>
						<p className="text-sm font-medium text-gray-600 dark:text-gray-300">Location</p>
						<p>
							{entity.location.city}, {entity.location.country}
						</p>
						<p className="mt-3 text-sm">IP: {entity.location.ip}</p>
					</div>
				</div>
			</div>
		</ComponentCard>
	);
};

export default EntityProfile;
