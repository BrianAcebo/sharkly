import React, { createContext, useCallback, useContext, useState } from 'react';
import { CROStudioModal } from '../components/cro/CROStudioModal';

interface CROStudioUpgradeContextValue {
	openCROStudioUpgradeModal: () => void;
}

const CROStudioUpgradeContext = createContext<CROStudioUpgradeContextValue | null>(null);

export function CROStudioUpgradeProvider({ children }: { children: React.ReactNode }) {
	const [modalOpen, setModalOpen] = useState(false);

	const openCROStudioUpgradeModal = useCallback(() => {
		setModalOpen(true);
	}, []);

	const closeModal = useCallback(() => {
		setModalOpen(false);
	}, []);

	return (
		<CROStudioUpgradeContext.Provider value={{ openCROStudioUpgradeModal }}>
			{children}
			<CROStudioModal open={modalOpen} onClose={closeModal} reason="general" />
		</CROStudioUpgradeContext.Provider>
	);
}

export function useCROStudioUpgrade() {
	const ctx = useContext(CROStudioUpgradeContext);
	if (!ctx) {
		return { openCROStudioUpgradeModal: () => {} };
	}
	return ctx;
}
