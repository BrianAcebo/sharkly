import React, { useEffect, useState } from 'react';
import { AuthLoadingState } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from './ui/button';

interface AuthLoadingProps {
	state: AuthLoadingState;
}

export const AuthLoading: React.FC<AuthLoadingProps> = ({ state }) => {
	const [showResetButton, setShowResetButton] = useState(false);

	useEffect(() => {
		// Show reset button after 8 seconds of loading
		const timer = setTimeout(() => {
			setShowResetButton(true);
		}, 8000);

		return () => clearTimeout(timer);
	}, []);

	if (state === AuthLoadingState.IDLE) return null;

	return (
		<div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
			<div className="relative h-8 w-8">
				<motion.div
					className="border-red-400/20 h-8 w-8 rounded-full border-2"
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
					className="border-t-red-400 absolute top-0 left-0 h-8 w-8 rounded-full border-2 border-r-transparent border-b-transparent border-l-transparent"
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
			
			{showResetButton && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.3 }}
				>
					<Button 
						variant="outline" 
						size="sm"
						onClick={() => window.location.reload()}
						className="text-xs"
					>
						Reload Page
					</Button>
				</motion.div>
			)}
		</div>
	);
};
