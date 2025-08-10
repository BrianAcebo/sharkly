import React from 'react';
import { ExternalLink, Linkedin, Twitter, Facebook, Instagram, Globe } from 'lucide-react';
import type { Case } from '../../types/leads';
import ComponentCard from '../common/ComponentCard';

interface SocialProfilesProps {
	profiles: Case['entity']['socialProfiles'];
}

const SocialProfiles: React.FC<SocialProfilesProps> = ({ profiles }) => {
	const getPlatformIcon = (platform: string) => {
		switch (platform.toLowerCase()) {
			case 'linkedin':
				return Linkedin;
			case 'twitter':
				return Twitter;
			case 'facebook':
				return Facebook;
			case 'instagram':
				return Instagram;
			default:
				return Globe;
		}
	};

	const getPlatformColor = (platform: string) => {
		switch (platform.toLowerCase()) {
			case 'linkedin':
				return 'bg-blue-600 text-white';
			case 'twitter':
				return 'bg-sky-500 text-white';
			case 'facebook':
				return 'bg-blue-700 text-white';
			case 'instagram':
				return 'bg-pink-600 text-white';
			default:
				return 'bg-slate-600 text-white';
		}
	};

	return (
		<ComponentCard>
			<h3 className="mb-4 text-lg font-semibold">Social Media Profiles</h3>

			<div className="space-y-3">
				{profiles.map((profile, index) => {
					const PlatformIcon = getPlatformIcon(profile.platform);
					return (
						<div
							key={index}
							className="flex items-center justify-between rounded-lg transition-colors"
						>
							<div className="flex items-center space-x-3">
								<div className={`rounded-lg p-2 ${getPlatformColor(profile.platform)}`}>
									<PlatformIcon className="h-5 w-5" />
								</div>
								<div>
									<p className="font-medium">{profile.platform}</p>
									<p className="text-sm">@{profile.username}</p>
								</div>
							</div>
							<a
								href={profile.url}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center space-x-1 text-sm font-medium text-gray-600 transition-colors dark:text-gray-400"
							>
								<span className="sr-only">View {profile.platform} Profile</span>
								<ExternalLink className="h-4 w-4" />
							</a>
						</div>
					);
				})}
			</div>
		</ComponentCard>
	);
};

export default SocialProfiles;
