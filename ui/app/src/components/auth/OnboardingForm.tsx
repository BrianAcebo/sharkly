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
	const next = searchParams.get('next') ?? '/dashboard';

	useEffect(() => {
		if (user && !hasShownWelcomeToast) {
			const params = new URLSearchParams(window.location.search);
			const isNewlyVerified =
				params.get('verified') === 'true' ||
				params.get('type') === 'email' ||
				window.location.pathname.includes('/auth/confirm');

			if (isNewlyVerified) {
				toast.success('🎉 Welcome! Your email has been verified successfully.');
			}
			setHasShownWelcomeToast(true);
		}
	}, [user, hasShownWelcomeToast]);

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
			return;
		}

		if (!firstName.trim() || !lastName.trim()) {
			setError('Please fill in all required fields');
			return;
		}

		setError('');
		setIsLoading(true);
		try {
			let avatarPath: string | null = null;

			if (avatar) {
				const fileExt = avatar.name.split('.').pop();
				const fileName = `${Date.now()}.${fileExt}`;

				const { error: uploadError } = await supabase.storage
					.from('avatars')
					.upload(fileName, avatar, {
						upsert: true,
						cacheControl: '3600',
						contentType: avatar.type
					});

				if (uploadError) {
					throw uploadError;
				}

				avatarPath = fileName;
			}

			const { error: updateError } = await supabase
				.from('profiles')
				.update({
					first_name: firstName,
					last_name: lastName,
					avatar: avatarPath,
					completed_onboarding: true
				})
				.eq('id', user.id);

			if (updateError) {
				throw updateError;
			}

			await updateUser();

			toast.success('Profile updated successfully!');

			setTimeout(() => {
				navigate(next);
			}, 100);
		} catch (err) {
			console.error('Profile onboarding error:', err);
			setError('An error occurred while updating your profile');
		} finally {
			setIsLoading(false);
		}
	};

	if (user?.completed_onboarding) {
		return <Navigate to={next} replace />;
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
						<form onSubmit={handleSubmit} id="onboarding-form">
							<div className="space-y-6">
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

								<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
									<div className="sm:col-span-1">
										<Label>
											First Name<span className="text-error-500">*</span>
										</Label>
										<Input
											type="text"
											value={firstName}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												setFirstName(e.target.value)
											}
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
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												setLastName(e.target.value)
											}
											placeholder="Enter your last name"
											required
										/>
									</div>
								</div>

								<div>
									<Button variant="primary" type="submit" disabled={isLoading} fullWidth>
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
