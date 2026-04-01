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
	const widthNum = typeof width === 'number' ? width : undefined;
	const heightNum = typeof height === 'number' ? height : undefined;

	const iconWidth =
		typeof width === 'number' ? Math.round(width / 4) : undefined;
	const iconHeight =
		typeof height === 'number' && typeof heightNum === 'number'
			? Math.round(heightNum / 4)
			: undefined;

	/** Invalid img height attrs (e.g. "auto") cause intrinsic SVG size to flash before layout. */
	const imgClass = cn('h-auto max-h-full w-auto max-w-full shrink-0 object-contain', className);

	return (
		<>
			{!isIcon ? (
				<>
					<img
						className={cn('dark:hidden', imgClass)}
						src="/images/logos/logo.svg"
						alt={alt}
						width={widthNum}
						height={heightNum}
						// @ts-expect-error - fetchPriority is not a valid prop
						fetchpriority={fetchPriority}
						title={alt}
					/>
					<img
						className={cn('hidden dark:block', imgClass)}
						src="/images/logos/logo-dark.svg"
						alt={alt}
						width={widthNum}
						height={heightNum}
						// @ts-expect-error - fetchPriority is not a valid prop
						fetchpriority={fetchPriority}
						title={alt}
					/>
				</>
			) : (
				<>
					<img
						className={cn('dark:hidden', imgClass)}
						src="/images/logos/logo-icon.svg"
						alt={alt}
						width={iconWidth}
						height={iconHeight}
						// @ts-expect-error - fetchPriority is not a valid prop
						fetchpriority={fetchPriority}
						title={alt}
					/>
					<img
						className={cn('hidden dark:block', imgClass)}
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
