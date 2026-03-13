import { cn } from '../../utils/common';

type LogoProps = {
	width?: number | 'auto';
	height?: number | 'auto';
	isIcon?: boolean;
	className?: string;
	alt?: string;
	fetchPriority?: 'high' | 'low' | 'auto';
};

export function Logo({
	width = 200,
	height = 65,
	isIcon = false,
	className,
	alt = 'Sharkly logo',
	fetchPriority = 'high'
}: LogoProps) {
	const iconWidth = Number(width) / 4 || 'auto';
	const iconHeight = Number(height) / 4 || 'auto';

	return (
		<>
			{!isIcon ? (
				<>
					<img
						className={cn('dark:hidden', className)}
						src="/images/logos/logo.svg"
						alt={alt}
						width={width}
						height={height}
						// @ts-expect-error - fetchPriority is not a valid prop
						fetchpriority={fetchPriority}
						title={alt}
					/>
					<img
						className={cn('hidden dark:block', className)}
						src="/images/logos/logo-dark.svg"
						alt={alt}
						width={width}
						height={height}
						// @ts-expect-error - fetchPriority is not a valid prop
						fetchpriority={fetchPriority}
						title={alt}
					/>
				</>
			) : (
				<>
					<img
						className={cn('dark:hidden', className)}
						src="/images/logos/logo-icon.svg"
						alt={alt}
						width={iconWidth}
						height={iconHeight}
						// @ts-expect-error - fetchPriority is not a valid prop
						fetchpriority={fetchPriority}
						title={alt}
					/>
					<img
						className={cn('hidden dark:block', className)}
						src="/images/logos/logo-icon-dark.svg"
						alt={alt}
						width={iconWidth}
						height={iconHeight}
						// @ts-expect-error - fetchPriority is not a valid prop
						fetchpriority={fetchPriority}
						title={alt}
					/>
				</>
			)}
		</>
	);
}

export default Logo;
