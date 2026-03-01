import { Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useSiteContext } from '../../contexts/SiteContext';

export default function SiteSelector() {
	const { selectedSite, sites, loading, setSelectedSite } = useSiteContext();

	const effectiveSite = selectedSite ?? sites[0];

	if (loading || sites.length === 0) {
		return null;
	}

	return (
		<Select value={effectiveSite?.id} onValueChange={(value) => setSelectedSite(value)}>
			<SelectTrigger className="h-9 w-[180px]" aria-label="Select site">
				{effectiveSite?.logo ? (
					<img src={effectiveSite.logo} alt="" className="size-5 rounded object-cover" />
				) : (
					<Globe className="size-4 shrink-0 text-gray-400 dark:text-gray-400" />
				)}
				<SelectValue placeholder="Select site">{effectiveSite?.name}</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{sites.map((site) => (
					<SelectItem key={site.id} value={site.id}>
						<div className="flex items-center gap-2">
							{site.logo ? (
								<img src={site.logo} alt="" className="size-5 rounded object-cover" />
							) : (
								<Globe className="size-4 text-gray-400 dark:text-gray-400" />
							)}
							<span>{site.name}</span>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
