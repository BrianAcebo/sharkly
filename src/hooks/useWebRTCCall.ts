import { useContext } from 'react';
import { WebRTCCallContext } from '../contexts/WebRTCCallContext';

export const useWebRTCCall = () => {
	const context = useContext(WebRTCCallContext);
	if (context === undefined) {
		throw new Error('useWebRTCCall must be used within a WebRTCCallProvider');
	}
	return context;
};
