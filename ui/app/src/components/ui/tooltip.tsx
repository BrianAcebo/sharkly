import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/common';

export interface TooltipProps {
	content: string;
	children: React.ReactNode;
	className?: string;
	tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
	/** Render in portal to avoid overflow clipping (use for long content) */
	usePortal?: boolean;
}

export function Tooltip({
	content,
	children,
	className,
	tooltipPosition = 'top',
	usePortal = false
}: TooltipProps) {
	const [visible, setVisible] = React.useState(false);
	const [coords, setCoords] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
	const ref = React.useRef<HTMLSpanElement>(null);

	const updatePosition = React.useCallback(() => {
		if (ref.current) {
			const rect = ref.current.getBoundingClientRect();
			setCoords({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
		}
	}, []);

	const handleMouseEnter = () => {
		updatePosition();
		setVisible(true);
	};

	const handleMouseLeave = () => setVisible(false);

	const tooltipPositionStyles = React.useMemo(() => {
		if (!usePortal) return {};
		const gap = 8;
		switch (tooltipPosition) {
			case 'top':
				return {
					bottom: window.innerHeight - coords.y + gap,
					left: coords.x + coords.width / 2,
					transform: 'translateX(-50%)'
				};
			case 'bottom':
				return {
					top: coords.y + coords.height + gap,
					left: coords.x + coords.width / 2,
					transform: 'translateX(-50%)'
				};
			case 'left':
				return {
					top: coords.y + coords.height / 2,
					right: window.innerWidth - coords.x + gap,
					transform: 'translateY(-50%)'
				};
			case 'right':
				return {
					top: coords.y + coords.height / 2,
					left: coords.x + coords.width + gap,
					transform: 'translateY(-50%)'
				};
			default:
				return {};
		}
	}, [usePortal, tooltipPosition, coords]);

	const tooltipPositionClasses = {
		top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
		bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
		left: 'right-full top-1/2 -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 -translate-y-1/2 ml-2'
	};

	const tooltipContent = (
		<span
			className={cn(
				'pointer-events-none z-[9999] min-w-[220px] max-w-[340px] whitespace-normal rounded bg-black px-3 py-2 text-left text-xs text-white',
				usePortal ? 'fixed' : 'absolute',
				!usePortal && tooltipPositionClasses[tooltipPosition],
				!usePortal && 'scale-0 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100',
				usePortal && 'animate-in fade-in-0 zoom-in-95 duration-150',
				className
			)}
			style={usePortal ? tooltipPositionStyles : undefined}
		>
			{content}
		</span>
	);

	return (
		<span
			ref={ref}
			className={cn('group relative', usePortal && 'inline')}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{children}
			{usePortal
				? visible && typeof document !== 'undefined' && createPortal(tooltipContent, document.body)
				: tooltipContent}
		</span>
	);
}
