import { useState, useRef, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import { Button } from '../ui/button';
import { supabase } from '../../utils/supabaseClient';
import useAuth from '../../hooks/useAuth';
import { toast } from 'sonner';
import { Navigate, useNavigate } from 'react-router-dom';

export default function OnboardingForm() {
	const [firstName, setFirstName] = useState<string>('');
	const [lastName, setLastName] = useState<string>('');
	const [avatar, setAvatar] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [error, setError] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [hasShownWelcomeToast, setHasShownWelcomeToast] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { user, updateUser } = useAuth();
	const navigate = useNavigate();

	const searchParams = new URLSearchParams(window.location.search);
	const next = searchParams.get('next') ?? '/pipeline';

	// Show welcome toast when user first lands on onboarding
	useEffect(() => {
		if (user && !hasShownWelcomeToast) {
			// Only show welcome toast for newly verified users (not existing users signing in)
			// Check if user has just completed email verification by looking at URL params
			const searchParams = new URLSearchParams(window.location.search);
			const isNewlyVerified = searchParams.get('verified') === 'true' || 
								   searchParams.get('type') === 'email' ||
								   window.location.pathname.includes('/auth/confirm');
			
			if (isNewlyVerified) {
				toast.success('🎉 Welcome! Your email has been verified successfully.');
			}
			setHasShownWelcomeToast(true);
		}
	}, [user, hasShownWelcomeToast]);

	useEffect(() => {
		const orig = Event.prototype.preventDefault;
		Event.prototype.preventDefault = function (...args) {
		  if (this.type === 'click') {
			console.warn('preventDefault on click:', this, '\n', new Error('stack').stack);
		  }
		  return orig.apply(this, args);
		};
		return () => { Event.prototype.preventDefault = orig; };
	  }, []);

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setAvatar(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setAvatarPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleRemoveAvatar = () => {
		setAvatar(null);
		setAvatarPreview(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		
		if (!user) {
			console.log('No user found, returning');
			return;
		}

		// Validate required fields
		if (!firstName.trim() || !lastName.trim()) {
			console.log('Validation failed:', { firstName: firstName.trim(), lastName: lastName.trim() });
			setError('Please fill in all required fields');
			return;
		}

		console.log('Validation passed, starting profile update...');
		setIsLoading(true);
		try {
			let avatarPath = null;

			// Upload avatar if selected
			if (avatar) {
				console.log('Uploading avatar...');
				// Generate a unique filename with user ID to prevent collisions
				const fileExt = avatar.name.split('.').pop();
				const fileName = `${Date.now()}.${fileExt}`;

				const { error: uploadError } = await supabase.storage
					.from('avatars')
					.upload(fileName, avatar, {
						upsert: true, // Allow overwriting if file exists
						cacheControl: '3600',
						contentType: avatar.type // Set proper content type
					});

				if (uploadError) {
					console.error('Avatar upload error:', uploadError);
					throw uploadError;
				}

				console.log('Avatar uploaded successfully:', fileName);
				// Store just the file path
				avatarPath = fileName;
			}

			console.log('Updating profile in database...');
			// Update profile
			const { data: updateData, error: updateError } = await supabase
				.from('profiles')
				.update({
					first_name: firstName,
					last_name: lastName,
					avatar: avatarPath,
					completed_onboarding: true
				})
				.eq('id', user.id)
				.select();

			if (updateError) {
				console.error('Profile update error:', updateError);
				throw updateError;
			}

			console.log('Profile update successful:', updateData);

			// Provision phone number for the agent
			console.log('Provisioning phone number...');
			try {
				// Get the current session token
				const { data: { session } } = await supabase.auth.getSession();
				if (!session?.access_token) {
					throw new Error('No active session');
				}

				const response = await fetch(`${import.meta.env.VITE_TWILIO_API_URL || 'http://localhost:3001'}/internal/seat-created`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${session.access_token}`
					},
					body: JSON.stringify({
						agentId: user.id,
					})
				});

				if (response.ok) {
					const result = await response.json();
					console.log('Phone number provisioned:', result.phoneNumber);
				} else {
					console.warn('Phone number provisioning failed, but continuing with onboarding');
				}
			} catch (error) {
				console.warn('Phone number provisioning error, but continuing with onboarding:', error);
			}

			console.log('Calling updateUser()...');
			// Update the user state with new profile information
			await updateUser();

			console.log('updateUser completed, showing success toast...');
			toast.success('Profile updated successfully!');
			
			console.log('Waiting 100ms before navigation...');
			// Add a small delay to ensure the user state is updated
			setTimeout(() => {
				console.log('Navigating to:', next);
				navigate(next);
			}, 100);
		} catch (error) {
			console.error('Error in handleSubmit:', error);
			setError('An error occurred while updating your profile');
		} finally {
			console.log('Setting isLoading to false');
			setIsLoading(false);
		}
	};

	if (user?.completed_onboarding) {
		return <Navigate to={next} />;
	}

	return (
		<div className="flex w-full flex-1 flex-col">
			<div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pt-10">
				<div>
					<div className="mb-5 text-center sm:mb-8">
						<h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-900 dark:text-white/90">
							Complete Your Profile
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Add your personal information to get started
						</p>
					</div>
					<div>
						{error && (
							<p className="mb-4 text-center text-sm text-red-500 dark:text-red-400">{error}</p>
						)}
						<form onSubmit={handleSubmit} id="onboarding-form" onInvalid={() => console.log('invalid')}
							 onSubmitCapture={() => console.log('onSubmitCapture fired')}
							 onClickCapture={(e) => {
							   if ((e.target as HTMLElement).closest('button[type="submit"]')) {
								 console.log('submit click captured');
							   }
							 }}>
							<div className="space-y-6">
								{/* Avatar Upload */}
								<div className="flex flex-col items-center space-y-4">
									<div className="relative">
										{avatarPreview ? (
											<div className="relative">
												<img
													src={avatarPreview}
													alt="Avatar preview"
													className="h-32 w-32 rounded-full object-cover"
												/>
												<Button
													variant="icon"
													size="sm"
													startIcon={<X className="size-4" />}
													onClick={handleRemoveAvatar}
													className="absolute -top-2 -right-2"
												/>
											</div>
										) : (
											<div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700">
												<Upload className="size-8 text-gray-400" />
											</div>
										)}
									</div>
									<input
										type="file"
										accept="image/*"
										onChange={handleAvatarChange}
										ref={fileInputRef}
										className="hidden"
										id="avatar-upload"
									/>
									<label
										htmlFor="avatar-upload"
										className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
									>
										{avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
									</label>
								</div>

								{/* Name Fields */}
								<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
									<div className="sm:col-span-1">
										<Label>
											First Name<span className="text-error-500">*</span>
										</Label>
										<Input
											type="text"
											value={firstName}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
											placeholder="Enter your first name"
											required
										/>
									</div>
									<div className="sm:col-span-1">
										<Label>
											Last Name<span className="text-error-500">*</span>
										</Label>
										<Input
											type="text"
											value={lastName}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
											placeholder="Enter your last name"
											required
										/>
									</div>
								</div>

								{/* Submit Button */}
								<div>
									<Button
										variant="primary"
										type="submit"
										disabled={isLoading}
										fullWidth
										form="onboarding-form"
										onClickCapture={(e) => console.log('btn capture: defaultPrevented?', e.defaultPrevented)}
  onClick={(e) => console.log('btn bubble: defaultPrevented?', e.defaultPrevented)}
									>
										{isLoading ? 'Updating Profile...' : 'Complete Profile'}
									</Button>
								</div>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
