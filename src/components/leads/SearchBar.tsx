import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import Input from '../form/input/InputField';
import { cn } from '../../utils';

interface SearchBarProps {
	className?: string;
	value?: string;
	onChange?: (value: string) => void;
}

export function SearchBar({ className, value = '', onChange }: SearchBarProps) {
	const [showHistory, setShowHistory] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const historyRef = useRef<HTMLDivElement>(null);
	const [searchHistory] = useState<string[]>([]);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setShowHistory(false);
		onChange?.(event.target.value);
	};

	const handleHistoryItemClick = (item: string) => {
		onChange?.(item);
		setShowHistory(false);
	};

	const clearSearch = () => {
		onChange?.('');
		if (searchInputRef.current) {
			searchInputRef.current.focus();
		}
	};

	// Close history dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				historyRef.current &&
				!historyRef.current.contains(event.target as Node) &&
				searchInputRef.current &&
				!searchInputRef.current.contains(event.target as Node)
			) {
				setShowHistory(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	return (
		<div className={cn('relative w-full', className)}>
			<form className="dark:text-white-/60 relative text-gray-300 focus-within:text-gray-800 focus-within:dark:text-white">
				<Input
					ref={searchInputRef}
					type="text"
					placeholder="Search leads..."
					className="h-12 border-2 border-gray-200 bg-white pr-10 pl-10 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-0 dark:border-gray-800 dark:bg-white/[0.03] dark:placeholder:text-white/60"
					value={value}
					onChange={handleInputChange}
					onFocus={() => setShowHistory(searchHistory.length > 0)}
				/>

				<SearchIcon className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 stroke-current transition-colors" />

				{value && (
					<>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="absolute top-1/2 right-24 h-8 w-8 -translate-y-1/2"
							onClick={clearSearch}
							icon={<X className="size-4 stroke-current" />}
						>
							<span className="sr-only">Clear search</span>
						</Button>
					</>
				)}

				<Button type="submit" size="sm" className="absolute top-1/2 right-2 h-8 -translate-y-1/2">
					Search
				</Button>
			</form>

			{/* Search history dropdown */}
			{showHistory && searchHistory.length > 0 && (
				<div
					ref={historyRef}
					className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 absolute z-50 mt-3 w-full rounded-md border border-gray-200 bg-white p-2 shadow-md duration-100 dark:border-gray-700 dark:bg-gray-800"
				>
					<div className="p-2">
						<h3 className="mb-5 px-2 text-sm font-medium">Recent Searches</h3>
						<ul>
							{searchHistory.map((item, index) => (
								<li key={index}>
									<Button
										variant="outline"
										className="mb-1 h-9 w-full justify-start text-lg"
										onClick={() => handleHistoryItemClick(item)}
									>
										<Clock className="text-muted-foreground mr-2 size-4" />
										{item}
									</Button>
								</li>
							))}
						</ul>
					</div>
				</div>
			)}
		</div>
	);
}
