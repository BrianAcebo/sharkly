import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listBusinesses } from '../../api/businesses';
import type { BusinessRecord } from '../../types/business';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import useDebounce from '../../hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

export default function BusinessesPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [perPage] = useState(12);
	const [total, setTotal] = useState(0);
	const [results, setResults] = useState<BusinessRecord[]>([]);
	const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

	useEffect(() => {
		let active = true;
		async function run() {
			if (!user?.organization_id) return;
			setLoading(true);
			try {
				const { results: rows, total: t } = await listBusinesses(user.organization_id, debouncedSearch, page, perPage);
				if (!active) return;
				setResults(rows);
				setTotal(t);
			} finally {
				if (active) setLoading(false);
			}
		}
		run();
		return () => {
			active = false;
		};
	}, [user?.organization_id, debouncedSearch, page, perPage]);

	const numPages = Math.max(1, Math.ceil(total / perPage));

	return (
		<div>
			<PageMeta title="Businesses" description="Directory of businesses" noIndex />
			<div className="mx-auto max-w-7xl space-y-6 min-h-screen-height-visible">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">Businesses</h1>
					<div className="w-full max-w-sm">
						<Input
							placeholder="Search businesses..."
							value={search}
							onChange={(e) => {
								setPage(1);
								setSearch(e.target.value);
							}}
						/>
					</div>
				</div>

				{loading ? (
					<div className="text-sm text-gray-500">Loading...</div>
				) : results.length === 0 ? (
					<div className="text-sm text-gray-500">No businesses found.</div>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{results.map((biz) => (
							<Card key={biz.id} className="cursor-pointer" onClick={() => navigate(`/businesses/${biz.id}`)}>
								<CardHeader className="flex flex-row items-center gap-3">
									<Avatar className="h-10 w-10">
										<AvatarImage src={biz.avatar || undefined} alt={biz.name} />
										<AvatarFallback>{biz.name.charAt(0)}</AvatarFallback>
									</Avatar>
									<div>
										<div className="font-medium">{biz.name}</div>
										<div className="text-xs text-gray-500">Updated {formatDistanceToNow(new Date(biz.updated_at), { addSuffix: true })}</div>
									</div>
									<Button variant="link" size="sm" className="ml-auto text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" onClick={(e) => {
										e.stopPropagation();
										navigate(`/businesses/${biz.id}`);
									}}>
										View
									</Button>
								</CardHeader>
								<CardContent>
									<div className="text-sm text-gray-600">EIN / Tax ID: {biz.ein_tax_id || '—'}</div>
								</CardContent>
							</Card>
							))}
					</div>
				)}

				{numPages > 1 && (
					<div className="flex items-center justify-center gap-2">
						<Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
							Prev
						</Button>
						<div className="text-sm">
							Page {page} of {numPages}
						</div>
						<Button size="sm" variant="outline" disabled={page === numPages} onClick={() => setPage((p) => Math.min(numPages, p + 1))}>
							Next
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}


