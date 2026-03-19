import React, { createContext, useCallback, useContext, useState } from 'react';
import { TierUpgradeModal, type RequiredTier } from '../components/billing/TierUpgradeModal';

interface TierUpgradeContextValue {
	openTierUpgradeModal: (requiredTier: RequiredTier, featureLabel: string) => void;
}

const TierUpgradeContext = createContext<TierUpgradeContextValue | null>(null);

export function TierUpgradeProvider({ children }: { children: React.ReactNode }) {
	const [modalState, setModalState] = useState<{
		open: boolean;
		requiredTier: RequiredTier;
		featureLabel: string;
	} | null>(null);

	const openTierUpgradeModal = useCallback((requiredTier: RequiredTier, featureLabel: string) => {
		setModalState({ open: true, requiredTier, featureLabel });
	}, []);

	const closeModal = useCallback(() => {
		setModalState((prev) => (prev ? { ...prev, open: false } : null));
	}, []);

	return (
		<TierUpgradeContext.Provider value={{ openTierUpgradeModal }}>
			{children}
			{modalState && (
				<TierUpgradeModal
					open={modalState.open}
					onClose={closeModal}
					requiredTier={modalState.requiredTier}
					featureLabel={modalState.featureLabel}
				/>
			)}
		</TierUpgradeContext.Provider>
	);
}

export function useTierUpgrade() {
	const ctx = useContext(TierUpgradeContext);
	if (!ctx) {
		return { openTierUpgradeModal: () => {} };
	}
	return ctx;
}
