import React from 'react';
import { Mail, MapPin } from 'lucide-react';
import ComponentCard from '../common/ComponentCard';
import { PersonRecord } from '../../types/person';
import { UserAvatar } from '../common/UserAvatar';

interface PersonProfileProps {
	person: PersonRecord;
}

const PersonProfile: React.FC<PersonProfileProps> = ({ person }) => {
	if (!person) return null;

	return (
		<ComponentCard>
			<div className="mb-6 flex items-start justify-between">
				<div className="flex items-start space-x-4">
					<UserAvatar
						user={{
							name: person.name,
							avatar: person.avatar
						}}
						size="lg"
					/>
					<div>
					<h2 className="text-lg font-bold">{person.name}</h2>
					<p className="text-gray-600 capitalize dark:text-gray-300">person</p>
						<p className="text-sm text-gray-600 dark:text-gray-300">ID: {person.id}</p>
					</div>
				</div>

				{person.id && (
					<div>
						<a className="text-sm underline" href={`/people/${person.id}`}>
							View
						</a>
					</div>
				)}
			</div>

			<div className="space-y-4">
				<div className="flex items-start space-x-3 rounded-lg p-3">
					<Mail className="h-5 w-5" />
					<div>
						<p className="text-sm font-medium text-gray-600 dark:text-gray-300">Email Address</p>
						<p>{person.email}</p>
					</div>
				</div>

				<div className="flex items-start space-x-3 rounded-lg p-3">
					<MapPin className="h-5 w-5" />
					<div>
						<p className="text-sm font-medium text-gray-600 dark:text-gray-300">Location</p>
						{person.location?.city && person.location?.country && (
							<p>
								{person.location?.city}, {person.location?.country}
							</p>
						)}
						{person.location?.ip && <p className="mt-3 text-sm">IP: {person.location?.ip}</p>}
					</div>
				</div>

				{/* Confidence & Activity */}
				<div className="grid grid-cols-1 gap-4 rounded-lg p-3 md:grid-cols-3">
					<div>
						<p className="text-sm font-medium text-gray-600 dark:text-gray-300">Confidence</p>
						<p>{typeof person.confidence === 'number' ? `${Math.round(person.confidence * 100)}%` : '-'}</p>
					</div>
					<div>
						<p className="text-sm font-medium text-gray-600 dark:text-gray-300">First seen</p>
						<p>{person.first_seen ? new Date(person.first_seen).toLocaleString() : '-'}</p>
					</div>
					<div>
						<p className="text-sm font-medium text-gray-600 dark:text-gray-300">Last seen</p>
						<p>{person.last_seen ? new Date(person.last_seen).toLocaleString() : '-'}</p>
					</div>
				</div>
			</div>
		</ComponentCard>
	);
};

export default PersonProfile;
