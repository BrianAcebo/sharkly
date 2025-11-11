import ComponentCard from './ComponentCard';
import { Link } from 'react-router-dom';

type ProfileLike =
	| {
			label?: string | null;
			handle?: string | null;
			username?: string | null;
			platform?: string | null;
			url?: string | null;
	  }
	| {
			profile?: {
				handle?: string | null;
				platform?: string | null;
				profile_url?: string | null;
			} | null;
			label?: string | null;
	  };

function normalizeProfile(p: ProfileLike) {
	const profile =
		(typeof p === 'object' && 'profile' in p ? (p as any).profile : null) || (p as any);
	const platform: string | null =
		(profile?.platform as string | undefined) ??
		((p as any).platform as string | undefined) ??
		null;
	const handle: string | null =
		(profile?.handle as string | undefined) ??
		((p as any).handle as string | undefined) ??
		((p as any).username as string | undefined) ??
		null;
	const url: string | null =
		(profile?.profile_url as string | undefined) ?? ((p as any).url as string | undefined) ?? null;
	const label: string | null = ((p as any).label as string | undefined) ?? null;
	return { platform, handle, url, label };
}

export default function SocialProfilesCard({
	title = 'Social Profiles',
	profiles
}: {
	title?: string;
	profiles: ProfileLike[] | null | undefined;
}) {
	const items = (profiles ?? []).map(normalizeProfile);

	return (
		<ComponentCard>
			<h3 className="text-lg font-semibold">{title}</h3>
			{!items.length ? (
				<p className="mt-2 text-sm text-muted-foreground">No linked profiles.</p>
			) : (
				<div className="mt-3 space-y-2">
					{items.map((p, i) => {
						const text =
							p.label ||
							[p.platform || '', p.handle || ''].filter(Boolean).join(' — ') ||
							'Profile';
						return (
							<div key={i} className="text-sm">
								{p.url ? (
									<a
										href={/^https?:\/\//i.test(p.url) ? p.url : `https://${p.url}`}
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-600 hover:underline dark:text-blue-400"
									>
										{text}
									</a>
								) : (
									<span>{text}</span>
								)}
							</div>
						);
					})}
				</div>
			)}
		</ComponentCard>
	);
}


