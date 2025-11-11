import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { UserAvatar } from './UserAvatar';
import { Link2Off } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';

export type LinkedPersonItem = {
	id: string;
	name: string;
	avatar: string | null;
	linkTo: string;
	transformType?: string | null;
	confidenceScore?: number | null;
	retrievedAt?: string | null;
	sourceUrl?: string | null;
	sourceApi?: string | null;
};

export default function LinkedPeopleList({
	items,
	onUnlink
}: {
	items: LinkedPersonItem[];
	onUnlink?: (personId: string) => void | Promise<void>;
}) {
	if (!items.length) {
		return <p className="text-muted-foreground text-sm">No people linked.</p>;
	}
	return (
		<div className="space-y-3">
			{items.map((p) => (
				<div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
					<div>
						<div className="flex items-center gap-3">
							<UserAvatar user={{ name: p.name, avatar: p.avatar }} size="sm" />
							<Link to={p.linkTo} className="text-base font-medium hover:underline">
								{p.name}
							</Link>
						</div>
						<div className="text-muted-foreground mt-1 text-xs">
							{p.transformType ? <Badge variant="outline">{p.transformType}</Badge> : null}
							{p.confidenceScore != null ? (
								<span className="ml-2">Confidence: {(p.confidenceScore * 100).toFixed(0)}%</span>
							) : null}
							{p.retrievedAt ? (
								<span className="ml-2">Retrieved {new Date(p.retrievedAt).toLocaleString()}</span>
							) : null}
							{p.sourceApi ? <span className="ml-2">via {p.sourceApi}</span> : null}
							{p.sourceUrl ? (
								<a
									className="ml-2 underline"
									href={/^https?:\/\//i.test(p.sourceUrl) ? p.sourceUrl : `https://${p.sourceUrl}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									source
								</a>
							) : null}
						</div>
					</div>
					{onUnlink ? (
						<Tooltip tooltipPosition="top" content="Unlink person">
							<Button variant="ghost" size="sm" onClick={() => onUnlink(p.id)}>
								<Link2Off className="size-4" />
							</Button>
						</Tooltip>
					) : null}
				</div>
			))}
		</div>
	);
}
