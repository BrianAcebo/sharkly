import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext, UserProfile, AuthLoadingState } from '../contexts/AuthContext';
import { Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

interface ProfileData {
	id: string;
	first_name: string;
	last_name: string;
	avatar: string | null;
	completed_onboarding: boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [error, setError] = useState<AuthError | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [loadingState, setLoadingState] = useState<AuthLoadingState>(AuthLoadingState.LOADING);

	const updateUser = useCallback(async () => {
		try {
			const {
				data: { session: currentSession }
			} = await supabase.auth.getSession();
			if (!currentSession?.user) {
				console.error('No current session found');
				return;
			}

			const { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select(
					`
					id,
					first_name,
					last_name,
					avatar,
					completed_onboarding
				`
				)
				.eq('id', currentSession.user.id)
				.single();

			if (profileError) {
				console.error('Error fetching profile:', profileError);
				throw profileError;
			}

			if (profile) {
				const profileData = profile as ProfileData;
				let updatedUser = { ...currentSession.user } as UserProfile;

				// Query user_organizations table to get organization and role data
				const { data: userOrg, error: userOrgError } = await supabase
					.from('user_organizations')
					.select('organization_id, role')
					.eq('user_id', profileData.id)
					.single();

				if (userOrgError && userOrgError.code !== 'PGRST116') {
					// PGRST116 is the error code for no rows returned, which is expected if user is not in an organization
					console.error('Error fetching user organization:', userOrgError);
				}

				// Handle avatar URL
				let avatarUrl = '';
				if (profileData.avatar) {
					try {
						// Only generate URL if the avatar is a file path (not a full URL)
						if (!profileData.avatar.startsWith('http')) {
							const { data: imageUrl } = supabase.storage
								.from('avatars')
								.getPublicUrl(profileData.avatar);

							if (imageUrl?.publicUrl) {
								avatarUrl = imageUrl.publicUrl;
							}
						} else {
							avatarUrl = profileData.avatar;
						}
					} catch (error) {
						console.error('Error getting avatar URL:', error);
					}
				}

				// Update user with profile data and ensure avatar is a string
				updatedUser = {
					...updatedUser,
					...profileData,
					avatar: avatarUrl,
					organization_id: userOrg?.organization_id || '',
					role: userOrg?.role || ''
				};

				setUser(updatedUser);
			} else {
				console.error('No profile found for user:', currentSession.user.id);
			}
		} catch (err) {
			console.error('Error updating user:', err);
			toast.error('Failed to update user profile');
		}
	}, []);

	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(async ({ data: { session }, error }) => {
			if (error) {
				setError(error);
				if (error.message.includes('does not exist')) {
					supabase.auth.signOut();
				}
			} else {
				setSession(session);
				const currentUser = session?.user ?? null;
				setUser(currentUser as UserProfile);

				if (currentUser) {
					const { data: profile, error: profileError } = await supabase
						.from('profiles')
						.select(
							`
							id,
							first_name,
							last_name,
							avatar,
							completed_onboarding
						`
						)
						.eq('id', currentUser.id)
						.single();

					if (profileError) {
						console.error('Error fetching profile:', profileError);
						return;
					}

					if (profile) {
						const profileData = profile as ProfileData;
						let updatedUser = { ...currentUser } as UserProfile;

						// Query user_organizations table to get organization and role data
						const { data: userOrg, error: userOrgError } = await supabase
							.from('user_organizations')
							.select('organization_id, role')
							.eq('user_id', profileData.id)
							.single();

						if (userOrgError && userOrgError.code !== 'PGRST116') {
							// PGRST116 is the error code for no rows returned, which is expected if user is not in an organization
							console.error('Error fetching user organization:', userOrgError);
						}

						// Handle avatar URL
						let avatarUrl = '';
						if (profileData.avatar) {
							try {
								// Only generate URL if the avatar is a file path (not a full URL)
								if (!profileData.avatar.startsWith('http')) {
									const { data: imageUrl } = supabase.storage
										.from('avatars')
										.getPublicUrl(profileData.avatar);

									if (imageUrl?.publicUrl) {
										avatarUrl = imageUrl.publicUrl;
									}
								} else {
									avatarUrl = profileData.avatar;
								}
							} catch (error) {
								console.error('Error getting avatar URL:', error);
							}
						}

						// Update user with profile data and ensure avatar is a string
						updatedUser = {
							...updatedUser,
							...profileData,
							avatar: avatarUrl,
							organization_id: userOrg?.organization_id || '',
							role: userOrg?.role || ''
						};

						setUser(updatedUser);
					}
				}
			}
			setLoadingState(AuthLoadingState.IDLE);
		});

		// Listen for auth changes
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			setUser((session?.user as UserProfile) ?? null);
			setError(null);
		});

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	const signIn = useCallback(async (email: string, password: string) => {
		try {
			setLoadingState(AuthLoadingState.LOADING);
			const { error } = await supabase.auth.signInWithPassword({ email, password });
			if (error) throw error;
			setLoadingState(AuthLoadingState.IDLE);
		} catch (err) {
			setLoadingState(AuthLoadingState.IDLE);
			setError(err as AuthError);
			toast.error((err as AuthError).message);
			throw err;
		}
	}, []);

	const signUp = useCallback(async (email: string, password: string) => {
		try {
			const searchParams = new URLSearchParams(window.location.search);
			const next = searchParams.get('next');

			setLoadingState(AuthLoadingState.LOADING);
			const { error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/onboarding${next ? '?next=' + next : ''}`
				}
			});
			if (error) throw error;
			setLoadingState(AuthLoadingState.IDLE);
			toast.success('Successfully signed up!');
			setMessage('Sign up successful! Please check your email for verification.');
		} catch (err) {
			setLoadingState(AuthLoadingState.IDLE);
			setError(err as AuthError);
			toast.error((err as AuthError).message);
			throw err;
		}
	}, []);

	const signOut = useCallback(async () => {
		try {
			setLoadingState(AuthLoadingState.LOADING);
			const { error } = await supabase.auth.signOut();
			if (error) throw error;
			setLoadingState(AuthLoadingState.IDLE);
		} catch (err) {
			setLoadingState(AuthLoadingState.IDLE);
			setError(err as AuthError);
			toast.error((err as AuthError).message);
			throw err;
		}
	}, []);

	const signInWithGoogle = useCallback(async () => {
		try {
			const searchParams = new URLSearchParams(window.location.search);
			const next = searchParams.get('next') ?? '/pipeline';

			setLoadingState(AuthLoadingState.LOADING);
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/oauth/callback?next=${next}`
				}
			});
			if (error) throw error;
			setLoadingState(AuthLoadingState.IDLE);
		} catch (err) {
			setLoadingState(AuthLoadingState.IDLE);
			setError(err as AuthError);
			toast.error((err as AuthError).message);
			throw err;
		}
	}, []);

	const resetAuthState = useCallback(() => {
		setLoadingState(AuthLoadingState.IDLE);
		setError(null);
		setMessage(null);
	}, []);

	return (
		<AuthContext.Provider
			value={{
				user,
				session,
				error,
				message,
				loadingState,
				signIn,
				signUp,
				signOut,
				signInWithGoogle,
				updateUser,
				resetAuthState
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
