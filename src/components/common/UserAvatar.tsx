import React from 'react';
import { cn } from '../../utils/common';

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
		return (
			<img
				src={user.avatar}
				alt={user.name}
				className={cn(
					'rounded-full object-cover',
					sizeClass,
					className
				)}
			/>
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
