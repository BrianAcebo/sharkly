import { useState } from 'react';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';

const TONES = ['Professional', 'Friendly', 'Conversational', 'Bold', 'Authoritative'];

export default function SettingsBrandVoice() {
	const [tone, setTone] = useState('Friendly');
	const [includeTerms, setIncludeTerms] = useState([
		'licensed investigator',
		'digital forensics',
		'confidential'
	]);
	const [avoidTerms, setAvoidTerms] = useState<string[]>([]);

	return (
		<>
			<PageMeta title="Brand Voice" description="AI content style" />
			<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
				Brand Voice
			</h1>
			<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
				AI will match your style in all generated content.
			</p>

			<div className="mt-6 flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700">
				<div>
					<label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
						Tone
					</label>
					<div className="flex flex-wrap gap-2">
						{TONES.map((t) => (
							<button
								key={t}
								onClick={() => setTone(t)}
								className={`rounded-lg border px-3 py-2 text-sm ${
									tone === t
										? 'border-brand-500 bg-brand-50 text-brand-600 font-semibold'
										: 'border-gray-200 bg-white text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:text-white'
								}`}
							>
								{t}
							</button>
						))}
					</div>
				</div>

				<div>
					<label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
						Terms to always include
					</label>
					<div className="flex flex-wrap gap-2">
						{includeTerms.map((term) => (
							<span
								key={term}
								className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
							>
								{term}
								<button
									onClick={() => setIncludeTerms((prev) => prev.filter((x) => x !== term))}
									className="hover:text-error-600 text-gray-500 dark:text-gray-400"
								>
									×
								</button>
							</span>
						))}
						<input
							type="text"
							placeholder="Add term..."
							className="focus:border-brand-500 w-32 rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm focus:outline-none dark:border-gray-700"
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									const val = (e.target as HTMLInputElement).value.trim();
									if (val) setIncludeTerms((prev) => [...prev, val]);
									(e.target as HTMLInputElement).value = '';
								}
							}}
						/>
					</div>
				</div>

				<div>
					<label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
						Terms to avoid
					</label>
					<div className="flex flex-wrap gap-2">
						{avoidTerms.map((term) => (
							<span
								key={term}
								className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
							>
								{term}
								<button
									onClick={() => setAvoidTerms((prev) => prev.filter((x) => x !== term))}
									className="hover:text-error-600 text-gray-500 dark:text-gray-400"
								>
									×
								</button>
							</span>
						))}
						<input
							type="text"
							placeholder="Add term..."
							className="focus:border-brand-500 w-32 rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm focus:outline-none dark:border-gray-700"
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									const val = (e.target as HTMLInputElement).value.trim();
									if (val) setAvoidTerms((prev) => [...prev, val]);
									(e.target as HTMLInputElement).value = '';
								}
							}}
						/>
					</div>
				</div>

				<div>
					<label className="mb-2 block text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
						Sample AI Output
					</label>
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 italic dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
						As a licensed investigator with over 15 years of experience, we bring confidential,
						professional digital forensics to every case...
					</div>
				</div>

				<Button className="bg-brand-500 hover:bg-brand-600 w-full text-white">
					Save Brand Voice
				</Button>
			</div>
		</>
	);
}
