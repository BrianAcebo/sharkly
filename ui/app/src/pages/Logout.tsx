import { useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function LogoutPage() {
	const marketingUrl = import.meta.env.VITE_MARKETING_URL ?? 'https://sharkly.co';
	const handleSignOut = async () => {
		try {
			await supabase.auth.signOut();
			window.location.href = marketingUrl;
		} catch (error) {
			console.error('Error signing out:', error);
		}
	};

	useEffect(() => {
		handleSignOut();
	}, []);

	return <></>;
}
