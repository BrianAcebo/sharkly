import React from 'react';
import { Database } from 'lucide-react';
import type { Case } from '../../types/case';
import ComponentCard from '../common/ComponentCard';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

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

			{caseData.assigned_to && caseData.assigned_to.length > 0 && (
				<ComponentCard>
					<h3 className="mb-4 text-lg font-semibold">Assigned Investigators</h3>

					<div>
						<div className="mt-1 flex flex-wrap gap-1">
							{caseData.assigned_to.map((investigator, index) => (
								<Button
									key={index}
									variant="flat"
									className="flex items-center space-x-1 px-3 py-2"
								>
									<Avatar className="h-8 w-8">
										<AvatarImage
											src={investigator.profile.avatar}
											alt={investigator.profile.first_name}
										/>
										<AvatarFallback>{investigator.profile.first_name.charAt(0)}</AvatarFallback>
									</Avatar>
									<div>
										<p className="text-sm font-medium">
											{investigator.profile.first_name} {investigator.profile.last_name}
										</p>
									</div>
								</Button>
							))}
						</div>
					</div>
				</ComponentCard>
			)}
		</>
	);
};

export default CaseMetadata;
