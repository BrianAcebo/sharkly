import React, { useState } from 'react';
import { cn } from '../../utils/common';
import { Dialog, DialogContent } from '../ui/dialog';

interface UserAvatarProps {
	user: {
		name: string;
		avatar?: string | null;
	};
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
	user, 
	size = 'md', 
	className 
}) => {
	const sizeClasses = {
		sm: 'w-8 h-8 text-xs',
		md: 'w-10 h-10 text-sm',
		lg: 'w-12 h-12 text-base'
	};

	const sizeClass = sizeClasses[size];

	if (user.avatar) {
		const [open, setOpen] = useState(false);
		return (
			<>
				<img
					src={user.avatar}
					alt={user.name}
					onClick={() => setOpen(true)}
					role="button"
					className={cn(
						'rounded-full object-cover cursor-zoom-in',
						sizeClass,
						className
					)}
				/>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogContent className="max-w-3xl">
						<div className="flex items-center justify-center">
							<img
								src={user.avatar}
								alt={user.name}
								className="max-h-[75vh] w-auto rounded"
							/>
						</div>
					</DialogContent>
				</Dialog>
			</>
		);
	}

	return (
		<div className={cn(
			'rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center',
			sizeClass,
			className
		)}>
			<span className="font-medium text-brand-600 dark:text-brand-400">
				{user.name.charAt(0).toUpperCase()}
			</span>
		</div>
	);
};

export default UserAvatar;
