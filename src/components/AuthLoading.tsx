import React from 'react';
import { AuthLoadingState } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

interface AuthLoadingProps {
	state: AuthLoadingState;
}

export const AuthLoading: React.FC<AuthLoadingProps> = ({ state }) => {
	if (state === AuthLoadingState.IDLE) return null;

	return (
		<div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
			<div className="relative h-8 w-8">
				<motion.div
					className="border-primary/20 h-8 w-8 rounded-full border-2"
					animate={{
						rotate: 360
					}}
					transition={{
						duration: 1,
						repeat: Infinity,
						ease: 'linear'
					}}
				/>
				<motion.div
					className="border-t-primary absolute top-0 left-0 h-8 w-8 rounded-full border-2 border-r-transparent border-b-transparent border-l-transparent"
					animate={{
						rotate: -360
					}}
					transition={{
						duration: 0.8,
						repeat: Infinity,
						ease: 'linear'
					}}
				/>
			</div>
			<motion.p
				className="text-sm text-gray-600 dark:text-gray-400"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.2 }}
			>
				Loading...
			</motion.p>
		</div>
	);
};
