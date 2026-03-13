import { TopUpForm } from './TopUpForm';

export function CreditsTopUpModal({
	open,
	onClose
}: {
	open: boolean;
	onClose: () => void;
}) {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-2.5">
			<div className="absolute inset-0 h-full w-full bg-black/45" aria-hidden="true" />
			<div
				className="relative w-full max-w-md rounded-lg bg-white p-4 shadow-2xl dark:bg-gray-900"
				onClick={(event) => event.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute right-3 top-3 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
				>
					<span className="sr-only">Close</span>
					&times;
				</button>
				<header className="mb-4">
					<h2 className="text-base font-semibold text-gray-900 dark:text-white">Top Up Wallet</h2>
					<p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
						Add funds to your wallet to continue investigations.
					</p>
				</header>
				<TopUpForm
					onSuccess={() => {
						onClose();
					}}
					onCancel={onClose}
				/>
			</div>
		</div>
	);
}


