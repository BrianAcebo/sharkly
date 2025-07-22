import React from 'react';
import { Database } from 'lucide-react';
import type { Case } from '../../types/leads';
import ComponentCard from '../common/ComponentCard';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { TeamMember } from '../../types/leads';

interface CaseMetadataProps {
	caseData: Case;
}

const CaseMetadata: React.FC<CaseMetadataProps> = ({ caseData }) => {
	return (
		<>
			<ComponentCard>
				<h3 className="mb-4 text-lg font-semibold">Link Analysis</h3>

				<div className="space-y-4">
					<div className="flex items-center space-x-3">
						<Database className="h-5 w-5" />
						<a href={`/graph/${caseData.id}`} className="text-sm font-medium underline">
							View Entity Graph
						</a>
					</div>
				</div>
			</ComponentCard>

			{caseData.assignedTo.length > 0 && (
				<ComponentCard>
					<h3 className="mb-4 text-lg font-semibold">Assigned Team Members</h3>
					<div className="space-y-3">
						{caseData.assignedTo.map((teamMember: TeamMember, index: number) => (
							<div key={index} className="flex items-center space-x-3">
								<Avatar className="h-8 w-8">
									<AvatarImage
										src={teamMember.profile.avatar}
										alt={teamMember.profile.first_name}
									/>
									<AvatarFallback>{teamMember.profile.first_name.charAt(0)}</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-medium">
										{teamMember.profile.first_name} {teamMember.profile.last_name}
									</p>
								</div>
							</div>
						))}
					</div>
				</ComponentCard>
			)}
		</>
	);
};

export default CaseMetadata;
