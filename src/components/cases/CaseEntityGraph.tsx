import React from 'react';
import { Database } from 'lucide-react';
import type { Case } from '../../types/case';
import ComponentCard from '../common/ComponentCard';

interface CaseEntityGraphProps {
	caseData: Case;
}

const CaseEntityGraph: React.FC<CaseEntityGraphProps> = ({ caseData }) => {
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
		</>
	);
};

export default CaseEntityGraph;
