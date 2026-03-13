import { cn } from '../../utils/common';

interface SkeletonProps {
	className?: string;
	count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
	return (
		<>
			{Array.from({ length: count }).map((_, i) => (
				<div
					key={i}
					className={cn('animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700', className)}
				/>
			))}
		</>
	);
}

export function StatSkeleton() {
	return (
		<div className="space-y-2">
			<Skeleton className="h-8 w-24" />
			<Skeleton className="h-4 w-32" />
		</div>
	);
}

export function ChartSkeleton() {
	return <Skeleton className="h-56 w-full rounded-xl" />;
}
