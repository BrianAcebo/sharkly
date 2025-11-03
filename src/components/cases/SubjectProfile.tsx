import React from 'react';
import { Mail, MapPin } from 'lucide-react';
import ComponentCard from '../common/ComponentCard';
import { SubjectRecord } from '../../api/subjects';
import { UserAvatar } from '../common/UserAvatar';

interface SubjectProfileProps {
	subject: SubjectRecord;
}

const SubjectProfile: React.FC<SubjectProfileProps> = ({ subject }) => {
	if (!subject) return null;

	return (
		<ComponentCard>
			<div className="mb-6 flex items-start justify-between">
				<div className="flex items-start space-x-4">
					<UserAvatar
						user={{
							name: subject.name,
							avatar: subject.avatar
						}}
						size="lg"
					/>
					<div>
						<h2 className="text-lg font-bold">{subject.name}</h2>
						<p className="text-gray-600 capitalize dark:text-gray-300">{subject.type}</p>
						<p className="text-sm text-gray-600 dark:text-gray-300">ID: {subject.id}</p>
					</div>
				</div>

				{subject.id && (
					<div>
						<a className="text-sm underline" href={`/subjects/${subject.id}`}>
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
						<p>{subject.email}</p>
					</div>
				</div>

				<div className="flex items-start space-x-3 rounded-lg p-3">
					<MapPin className="h-5 w-5" />
					<div>
						<p className="text-sm font-medium text-gray-600 dark:text-gray-300">Location</p>
						{subject.location?.city && subject.location?.country && (
							<p>
								{subject.location?.city}, {subject.location?.country}
							</p>
						)}
						{subject.location?.ip && <p className="mt-3 text-sm">IP: {subject.location?.ip}</p>}
					</div>
				</div>
			</div>
		</ComponentCard>
	);
};

export default SubjectProfile;
