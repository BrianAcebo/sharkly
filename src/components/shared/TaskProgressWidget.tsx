/**
 * Floating bottom-right widget for long-running AI tasks.
 * Non-blocking — user can continue using the app while the task runs.
 * Supports auto-simulated step progression for single-shot API calls.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export type TaskStep = {
	id: string;
	label: string;
	status: 'pending' | 'active' | 'complete';
};

export type TaskStatus = 'running' | 'done' | 'error';

type Props = {
	open: boolean;
	title: string;
	status: TaskStatus;
	steps: TaskStep[];
	errorMessage?: string;
	/** ms between auto-advancing steps when status='running'. Default 3200ms. */
	stepInterval?: number;
	onClose: () => void;
};

// Dual-ring spinner
function Spinner() {
	return (
		<div className="relative size-4 shrink-0">
			<motion.div
				className="border-brand-500/20 absolute inset-0 rounded-full border-2"
				animate={{ rotate: 360 }}
				transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
			/>
			<motion.div
				className="border-t-brand-500 absolute inset-0 rounded-full border-2 border-transparent"
				animate={{ rotate: -360 }}
				transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
			/>
		</div>
	);
}

// Animated step icon
function StepIcon({ status }: { status: TaskStep['status'] }) {
	if (status === 'complete') {
		return (
			<motion.span
				initial={{ scale: 0.4, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ type: 'spring', stiffness: 400, damping: 20 }}
				className="bg-brand-500 flex size-5 shrink-0 items-center justify-center rounded-full"
			>
				<Check className="size-3 text-white" strokeWidth={3} />
			</motion.span>
		);
	}
	if (status === 'active') {
		return (
			<span className="border-brand-500 bg-brand-50 dark:bg-brand-900/30 relative flex size-5 shrink-0 items-center justify-center rounded-full border-2">
				<motion.span
					className="bg-brand-500 size-1.5 rounded-full"
					animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
					transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
				/>
			</span>
		);
	}
	return (
		<span className="size-5 shrink-0 rounded-full border-2 border-gray-200 dark:border-gray-600" />
	);
}

export function TaskProgressWidget({
	open,
	title,
	status,
	steps: externalSteps,
	errorMessage,
	stepInterval = 3200,
	onClose
}: Props) {
	const [minimized, setMinimized] = useState(false);
	const [internalSteps, setInternalSteps] = useState<TaskStep[]>(externalSteps);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Sync external steps into internal (allows parent to override)
	useEffect(() => {
		setInternalSteps(externalSteps);
	}, [externalSteps]);

	// Auto-advance steps while running
	useEffect(() => {
		if (status !== 'running') return;

		const advance = () => {
			setInternalSteps((prev) => {
				const activeIdx = prev.findIndex((s) => s.status === 'active');
				const firstPending = prev.findIndex((s) => s.status === 'pending');

				if (activeIdx === -1 && firstPending === -1) return prev;

				return prev.map((s, i) => {
					if (i === activeIdx) return { ...s, status: 'complete' };
					if (i === activeIdx + 1 || (activeIdx === -1 && i === firstPending))
						return { ...s, status: 'active' };
					return s;
				});
			});

			timerRef.current = setTimeout(advance, stepInterval);
		};

		timerRef.current = setTimeout(advance, 600);
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [status, stepInterval]);

	// Complete all steps when done
	useEffect(() => {
		if (status === 'done') {
			if (timerRef.current) clearTimeout(timerRef.current);
			setInternalSteps((prev) => prev.map((s) => ({ ...s, status: 'complete' })));
			setMinimized(false);
		}
		if (status === 'error') {
			if (timerRef.current) clearTimeout(timerRef.current);
		}
	}, [status]);

	const completedCount = internalSteps.filter((s) => s.status === 'complete').length;
	const progress = internalSteps.length > 0 ? completedCount / internalSteps.length : 0;

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					key="task-widget"
					initial={{ opacity: 0, y: 24, scale: 0.96 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 16, scale: 0.95 }}
					transition={{ type: 'spring', stiffness: 340, damping: 28 }}
					className="fixed right-4 bottom-4 z-50 w-[340px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
				>
					{/* Animated border glow while running */}
					{status === 'running' && (
						<motion.div
							className="pointer-events-none absolute inset-0 rounded-xl"
							animate={{ opacity: [0.4, 0.9, 0.4] }}
							transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
							style={{
								boxShadow: 'inset 0 0 0 1.5px rgba(20,184,166,0.45)'
							}}
						/>
					)}

					{/* Header */}
					<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
						<div className="flex min-w-0 items-center gap-2.5">
							{status === 'running' && <Spinner />}
							{status === 'done' && (
								<motion.span
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: 'spring', stiffness: 500, damping: 22 }}
									className="bg-brand-500 flex size-4 shrink-0 items-center justify-center rounded-full"
								>
									<Check className="size-2.5 text-white" strokeWidth={3} />
								</motion.span>
							)}
							{status === 'error' && <AlertCircle className="text-error-500 size-4 shrink-0" />}
							<div className="min-w-0">
								<p className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">
									{title}
								</p>
								<p
									className={`text-[11px] font-medium ${
										status === 'running'
											? 'text-brand-500'
											: status === 'done'
												? 'text-brand-500'
												: 'text-error-500'
									}`}
								>
									{status === 'running'
										? 'Running… Please do not close the page.'
										: status === 'done'
											? 'Complete'
											: 'Failed'}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setMinimized((v) => !v)}
								className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
								aria-label={minimized ? 'Expand' : 'Minimize'}
							>
								{minimized ? (
									<ChevronUp className="size-3.5" />
								) : (
									<ChevronDown className="size-3.5" />
								)}
							</button>
							{status !== 'running' && (
								<button
									type="button"
									onClick={onClose}
									className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
									aria-label="Close"
								>
									<X className="size-3.5" />
								</button>
							)}
						</div>
					</div>

					{/* Progress bar */}
					<div className="h-0.5 w-full bg-gray-100 dark:bg-gray-800">
						<motion.div
							className="bg-brand-500 h-full"
							animate={{ width: `${progress * 100}%` }}
							transition={{ duration: 0.6, ease: 'easeOut' }}
						/>
					</div>

					{/* Step list */}
					<AnimatePresence initial={false}>
						{!minimized && (
							<motion.div
								key="steps"
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: 'auto', opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.22, ease: 'easeInOut' }}
								className="overflow-hidden"
							>
								<ul className="space-y-2.5 px-4 py-3">
									{internalSteps.map((step) => (
										<motion.li
											key={step.id}
											layout
											initial={{ opacity: 0, x: -8 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ duration: 0.25 }}
											className="flex items-center gap-2.5"
										>
											<StepIcon status={step.status} />
											<span
												className={`text-[13px] leading-snug transition-colors ${
													step.status === 'active'
														? 'font-semibold text-gray-900 dark:text-white'
														: step.status === 'complete'
															? 'text-gray-400 line-through dark:text-gray-500'
															: 'text-gray-400 dark:text-gray-500'
												}`}
											>
												{step.label}
											</span>
										</motion.li>
									))}
								</ul>

								{/* Error message */}
								{status === 'error' && errorMessage && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="bg-error-50 text-error-600 dark:bg-error-900/20 dark:text-error-400 mx-4 mb-3 rounded-lg px-3 py-2 text-[12px]"
									>
										{errorMessage}
									</motion.div>
								)}

								{/* Done message */}
								{status === 'done' && (
									<motion.div
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.15 }}
										className="bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 mx-4 mb-3 rounded-lg px-3 py-2 text-[12px] font-medium"
									>
										All done! Review your results above.
									</motion.div>
								)}
							</motion.div>
						)}
					</AnimatePresence>

					{/* Footer: step count */}
					{!minimized && (
						<div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
							<p className="text-[11px] text-gray-400 dark:text-gray-500">
								{completedCount} / {internalSteps.length} steps complete
							</p>
						</div>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
