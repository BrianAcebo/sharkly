import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthContext, UserProfile, AuthLoadingState } from '../contexts/AuthContext';
import { Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

interface ProfileData {
	id: string;
	first_name: string;
	last_name: string;
	avatar: string | null;
	title?: string;
	bio?: string;
	phone?: string;
	location?: string;
	completed_onboarding: boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [error, setError] = useState<AuthError | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [loadingState, setLoadingState] = useState<AuthLoadingState>(AuthLoadingState.LOADING);
	const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const refreshUser = useCallback(async () => {
		try {
			if (!user?.id) return;

			// Get the latest user profile
			const { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select(
					`
					id,
					first_name,
					last_name,
					avatar,
					title,
					bio,
					phone,
					location,
					completed_onboarding
				`
				)
				.eq('id', user.id)
				.single();

			if (profileError) {
				console.error('Error fetching profile:', profileError);
				return;
			}

			if (profile) {
				const profileData = profile as ProfileData;
				let updatedUser = { ...user };

				// Only try to get user organization if user has completed onboarding
				// This prevents 406 errors during onboarding when user hasn't joined org yet
				let userOrg = null;
				if (profileData.completed_onboarding) {
					try {
						const { data, error } = await supabase
							.from('user_organizations')
							.select('organization_id, role')
							.eq('user_id', profileData.id)
							.single();

						if (error) {
							if (error.code === 'PGRST116') {
								// No rows returned - user not in organization yet (this is normal)
								console.log('User not in organization yet (normal during onboarding)');
							} else if (error.code === '406') {
								// 406 error - table might not be accessible yet, skip organization data
								console.log('Organization data not accessible yet, skipping');
							} else {
								console.error('Error fetching user organization:', error);
							}
						} else {
							userOrg = data;
						}
					} catch (err) {
						console.error('Error in organization query:', err);
					}
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

				// Update user with profile data
				updatedUser = {
					...updatedUser,
					...profileData,
					avatar: avatarUrl,
					organization_id: userOrg?.organization_id || '',
					role: userOrg?.role || ''
				};

				setUser(updatedUser);
			}
		} catch (error) {
			console.error('Error refreshing user:', error);
		}
	}, [user]);

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

				// Only query user_organizations if user has completed onboarding
				// This prevents 406 errors during onboarding when user hasn't joined org yet
				let userOrg = null;
				if (profileData.completed_onboarding) {
					try {
						const { data, error: userOrgError } = await supabase
							.from('user_organizations')
							.select('organization_id, role')
							.eq('user_id', profileData.id)
							.single();

						if (userOrgError) {
							if (userOrgError.code === 'PGRST116') {
								// No rows returned - user not in organization yet (normal during onboarding)
								console.log('User not in organization yet (normal during onboarding)');
							} else if (userOrgError.code === '406') {
								// 406 error - table might not be accessible yet, skip organization data
								console.log('Organization data not accessible yet, skipping');
							} else {
								console.error('Error fetching user organization:', userOrgError);
							}
						} else {
							userOrg = data;
						}
					} catch (err) {
						console.error('Error in organization query:', err);
					}
				} else {
					console.log('User has not completed onboarding, skipping organization query');
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

	// Debounced user update to prevent excessive API calls
	const debouncedUpdateUser = useCallback((session: Session | null) => {
		// Clear existing timeout
		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current);
		}

		// Set new timeout
		updateTimeoutRef.current = setTimeout(async () => {
			if (session?.user) {
				try {
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
						.eq('id', session.user.id)
						.single();

					if (profileError) {
						console.error('Error fetching profile:', profileError);
						setUser(session.user as UserProfile);
						return;
					}

					if (profile) {
						const profileData = profile as ProfileData;
						let updatedUser = { ...session.user } as UserProfile;

						// Query user_organizations table to get organization and role data
						// Only query if user has completed onboarding to prevent 406 errors
						let userOrg = null;
						if (profileData.completed_onboarding) {
							const { data, error: userOrgError } = await supabase
								.from('user_organizations')
								.select('organization_id, role')
								.eq('user_id', profileData.id)
								.single();

							if (userOrgError) {
								if (userOrgError.code === 'PGRST116') {
									// No rows returned - user not in organization yet (normal during onboarding)
									console.log('User not in organization yet (normal during onboarding)');
								} else if (userOrgError.code === '406') {
									// 406 error - table might not be accessible yet, skip organization data
									console.log('Organization data not accessible yet, skipping');
								} else {
									console.error('Error fetching user organization:', userOrgError);
								}
							} else {
								userOrg = data;
							}
						}

						// Handle avatar URL
						let avatarUrl = '';
						if (profileData.avatar) {
							try {
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

						// Update user with profile data
						updatedUser = {
							...updatedUser,
							...profileData,
							avatar: avatarUrl,
							organization_id: userOrg?.organization_id || '',
							role: userOrg?.role || ''
						};

						setUser(updatedUser);
					} else {
						setUser(session.user as UserProfile);
					}
				} catch (error) {
					console.error('Error updating user on debounced update:', error);
					setUser(session.user as UserProfile);
				}
			} else {
				setUser(null);
			}
		}, 100); // 100ms debounce
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
						title,
						bio,
						phone,
						location,
						completed_onboarding
					`
						)
						.eq('id', currentUser.id)
						.single();

					if (profileError) {
						console.error('Error fetching profile:', profileError);

						// If profile doesn't exist, create it (fallback for new users)
						if (profileError.code === 'PGRST116') {
							try {
								const { error: createError } = await supabase.from('profiles').insert({
									id: currentUser.id,
									email: currentUser.email,
									first_name: '',
									last_name: '',
									title: '',
									bio: '',
									phone: '',
									location: '',
									completed_onboarding: false
								});

								if (createError) {
									console.error('Error creating profile:', createError);
									return;
								}

								// Set basic user with default profile
								const basicUser = {
									...currentUser,
									first_name: '',
									last_name: '',
									avatar: '',
									title: '',
									bio: '',
									phone: '',
									location: '',
									completed_onboarding: false,
									organization_id: '',
									role: ''
								} as UserProfile;

								setUser(basicUser);
								return;
							} catch (err) {
								console.error('Error in profile creation fallback:', err);
								return;
							}
						}

						return;
					}

					if (profile) {
						const profileData = profile as ProfileData;
						let updatedUser = { ...currentUser } as UserProfile;

						// Query user_organizations table to get organization and role data
						// Only query if user has completed onboarding to prevent 406 errors
						let userOrg = null;
						if (profileData.completed_onboarding) {
							const { data, error: userOrgError } = await supabase
								.from('user_organizations')
								.select('organization_id, role')
								.eq('user_id', profileData.id)
								.single();

							if (userOrgError) {
								if (userOrgError.code === 'PGRST116') {
									// No rows returned - user not in organization yet (normal during onboarding)
									console.log('User not in organization yet (normal during onboarding)');
								} else if (userOrgError.code === '406') {
									// 406 error - table might not be accessible yet, skip organization data
									console.log('Organization data not accessible yet, skipping');
								} else {
									console.error('Error fetching user organization:', userOrgError);
								}
							} else {
								userOrg = data;
							}
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

			// Use debounced update to prevent excessive API calls
			debouncedUpdateUser(session);

			setError(null);
		});

		return () => {
			subscription.unsubscribe();
			// Clear any pending timeout
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}
		};
	}, [debouncedUpdateUser]);

	// Refresh user data when tab becomes visible (but only if we have a session)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (!document.hidden && session?.user && user) {
				updateUser();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [session, user, updateUser]);

	const signIn = useCallback(
		async (email: string, password: string) => {
			try {
				// Capture invitation context before sign in
				const searchParams = new URLSearchParams(window.location.search);
				const inviteId = searchParams.get('invite');

				setLoadingState(AuthLoadingState.LOADING);
				const { error } = await supabase.auth.signInWithPassword({ email, password });
				if (error) throw error;

				// If this is an invitation sign-in, complete the invitation process
				if (inviteId) {
					try {
						console.log('Completing invitation process for user:', email);

						// Fetch the invitation details
						const { data: invite, error: inviteError } = await supabase
							.from('organization_invites')
							.select(
								`
							id,
							email,
							role,
							organization_id,
							status
						`
							)
							.eq('id', inviteId)
							.eq('email', email)
							.single();

						if (inviteError || !invite) {
							console.error('Error fetching invitation:', inviteError);
							toast.error('Invitation not found or invalid');
							setLoadingState(AuthLoadingState.IDLE);
							return;
						}

						if (invite.status !== 'pending') {
							console.log('Invitation already processed:', invite.status);
							toast.error('Invitation has already been processed');
							setLoadingState(AuthLoadingState.IDLE);
							return;
						}

						// Get the current user ID from the session
						const {
							data: { session: currentSession }
						} = await supabase.auth.getSession();
						if (!currentSession?.user) {
							console.error('No session found after sign in');
							setLoadingState(AuthLoadingState.IDLE);
							return;
						}

						// Check if user is already in the organization
						const { data: existingMember } = await supabase
							.from('user_organizations')
							.select('id')
							.eq('user_id', currentSession.user.id)
							.eq('organization_id', invite.organization_id)
							.single();

						if (!existingMember) {
							// Add user to the organization
							const { error: orgError } = await supabase.from('user_organizations').insert({
								user_id: currentSession.user.id,
								organization_id: invite.organization_id,
								role: invite.role
							});

							if (orgError) {
								console.error('Error adding user to organization:', orgError);
								toast.error('Failed to join organization');
								setLoadingState(AuthLoadingState.IDLE);
								return;
							}
						}

						// Update invitation status to accepted
						await supabase
							.from('organization_invites')
							.update({ status: 'accepted' })
							.eq('id', inviteId);

						// Immediately refresh user context to include organization data
						// This prevents race condition with auth state change
						await updateUser();

						// Success - user is now in organization
						toast.success('Successfully joined organization!');
						setMessage('Sign in successful! You have been added to the organization.');
					} catch (inviteError) {
						console.error('Error completing invitation:', inviteError);
						toast.error('Failed to complete invitation');
						setLoadingState(AuthLoadingState.IDLE);
						return;
					}
				} else {
					setMessage('Sign in successful!');
				}

				setLoadingState(AuthLoadingState.IDLE);
			} catch (err) {
				setLoadingState(AuthLoadingState.IDLE);
				setError(err as AuthError);
				toast.error((err as AuthError).message);
				console.error('Sign in error:', err);
				throw err;
			}
		},
		[updateUser]
	);

	const signUp = useCallback(async (email: string, password: string) => {
		try {
			const searchParams = new URLSearchParams(window.location.search);
			const inviteId = searchParams.get('invite');

			setLoadingState(AuthLoadingState.LOADING);
			const { error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/auth/confirm`,
					data: {
						base_url: window.location.origin,
						invite_id: inviteId || null
					}
				}
			});
			if (error) throw error;
			setLoadingState(AuthLoadingState.IDLE);

			if (inviteId) {
				toast.success(
					'Account created! Please check your email to verify your account, then complete your invitation.'
				);
				setMessage(
					'Account created successfully! Please check your email for verification, then return to complete your invitation.'
				);
			} else {
				toast.success('Successfully signed up!');
				setMessage('Sign up successful! Please check your email for verification.');
			}
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
			console.error('Sign out error:', err);
			throw err;
		}
	}, []);

	const signInWithGoogle = useCallback(async () => {
		try {
			const searchParams = new URLSearchParams(window.location.search);
			const next = searchParams.get('next') ?? '/dashboard';
			const inviteId = searchParams.get('invite');

			setLoadingState(AuthLoadingState.LOADING);
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: inviteId
						? `${window.location.origin}/oauth/callback?invite=${inviteId}&next=${next}`
						: `${window.location.origin}/oauth/callback?next=${next}`,
					// scopes: 'https://www.googleapis.com/auth/webmasters.readonly',
					queryParams: {
						access_type: 'offline',
						prompt: 'consent'
					}
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
				resetAuthState,
				refreshUser
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
