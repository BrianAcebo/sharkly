import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
	MessageSquare,
	Users,
	Zap,
	ArrowRight,
	Play,
	Pause,
	Volume2,
	VolumeX,
	RotateCcw,
	ChevronDown
} from 'lucide-react';
import { Lightbox } from '../ui/Lightbox';
import { Link } from 'react-router';

interface HeroProps {
	isLoading?: boolean;
}

const Hero: React.FC<HeroProps> = ({ isLoading = false }) => {
	const [introOpen, setIntroOpen] = useState(false);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(true);
	const [isMuted, setIsMuted] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(1);
	const previousVolumeRef = useRef(1);

	const closeIntro = useCallback(() => {
		const video = videoRef.current;
		if (video) {
			video.pause();
			video.currentTime = 0;
		}
		setIsPlaying(false);
		setIntroOpen(false);
	}, []);

	const formattedTime = useMemo(() => {
		const remaining = Math.max(duration - progress, 0);
		const minutes = Math.floor(remaining / 60)
			.toString()
			.padStart(2, '0');
		const seconds = Math.floor(remaining % 60)
			.toString()
			.padStart(2, '0');
		return `${minutes}:${seconds}`;
	}, [duration, progress]);

	const handleTimeUpdate = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		setProgress(video.currentTime);
	}, []);

	const handleLoadedMetadata = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		setDuration(video.duration);
		setProgress(video.currentTime);
		setIsPlaying(!video.paused);
		setIsMuted(video.muted);
		setVolume(video.volume ?? 1);
		previousVolumeRef.current = video.volume ?? 1;
	}, []);

	const togglePlay = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		if (video.paused) {
			void video.play();
			setIsPlaying(true);
		} else {
			video.pause();
			setIsPlaying(false);
		}
	}, []);

	const toggleMute = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		if (video.muted || volume === 0) {
			const restore = previousVolumeRef.current > 0 ? previousVolumeRef.current : 0.5;
			video.muted = false;
			video.volume = restore;
			setVolume(restore);
			setIsMuted(false);
		} else {
			previousVolumeRef.current = volume;
			video.muted = true;
			setIsMuted(true);
		}
	}, [volume]);

	const handleScrub = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const video = videoRef.current;
		if (!video) return;
		const newTime = Number(event.target.value);
		video.currentTime = newTime;
		setProgress(newTime);
	}, []);

	const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const video = videoRef.current;
		if (!video) return;
		const value = Number(event.target.value);
		video.volume = value;
		setVolume(value);
		if (value === 0) {
			video.muted = true;
			setIsMuted(true);
		} else {
			video.muted = false;
			setIsMuted(false);
			previousVolumeRef.current = value;
		}
	}, []);

	const handleReplay = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		video.currentTime = 0;
		void video.play();
		setIsPlaying(true);
	}, []);

	if (isLoading) {
		return (
			<section className="relative overflow-hidden pt-24 pb-16">
				{/* Background Elements - Keep the same gradient */}
				<div className="from-brand-50 via-blue-light-25 dark:to-brand-950/20 absolute inset-0 bg-gradient-to-br to-gray-50 dark:from-gray-900 dark:via-gray-900"></div>
				<div className="bg-brand-200/20 dark:bg-brand-500/10 absolute top-1/4 left-1/4 h-72 w-72 rounded-full blur-3xl"></div>
				<div className="bg-blue-light-200/20 dark:bg-blue-light-500/10 absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full blur-3xl"></div>

				<div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="text-center">
						{/* Badge Skeleton */}
						<div className="mb-8 inline-flex items-center rounded-full px-4 py-2">
							<div className="h-4 w-4 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
							<div className="ml-2 h-4 w-32 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
						</div>

						{/* Main Headline Skeleton */}
						<div className="mb-6 flex flex-col items-center space-y-4">
							<div className="h-12 w-3/4 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
							<div className="h-12 w-1/2 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
							<div className="h-12 w-2/3 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
						</div>

						{/* Subtitle Skeleton */}
						<div className="mx-auto mb-8 max-w-3xl space-y-2">
							<div className="h-6 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
							<div className="mx-auto h-6 w-5/6 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
						</div>

						{/* CTA Buttons Skeleton */}
						<div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
							<div className="h-14 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
							<div className="h-14 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
						</div>

						{/* Feature Icons Skeleton */}
						<div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3">
							{[...Array(3)].map((_, index) => (
								<div key={index} className="flex flex-col items-center">
									<div className="mb-4 h-16 w-16 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
									<div className="mb-2 h-5 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
									<div className="h-4 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="relative overflow-hidden pt-24 pb-16">
			{/* Background Elements */}
			<div className="via-brand-50/50 dark:via-brand-950/50 absolute inset-0 bg-gradient-to-r from-transparent to-gray-50 dark:from-transparent dark:to-gray-900"></div>
			<div className="bg-brand-200/20 dark:bg-brand-500/10 absolute top-1/4 left-1/4 h-72 w-72 rounded-full blur-3xl"></div>
			<div className="bg-blue-light-200/20 dark:bg-blue-light-500/10 absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full blur-3xl"></div>

			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					{/* Main Headline */}
					<h1 className="font-montserrat mb-6 text-4xl leading-tight font-semibold tracking-tighter text-gray-900 md:text-6xl lg:text-8xl dark:text-white">
						<div className="relative inline-block w-fit">
							<div className="absolute top-15 left-0 h-2 w-full rotate-8 rounded-full bg-red-700"></div>
							<span>Search</span>
							<span className="absolute -top-12 right-0 left-0 rotate-8 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 bg-clip-text text-5xl font-bold tracking-tight text-transparent italic">
								Shark
							</span>
							<ChevronDown className="absolute top-0 right-0 left-0 mx-auto size-7 rotate-8 text-gray-500" />
						</div>{' '}
						Engine
						<br />
						<span className="from-brand-400 via-brand-500 to-brand-600 bg-gradient-to-r bg-clip-text font-bold text-transparent">
							Optimization
						</span>
					</h1>

					{/* Subtitle */}
					<p className="mx-auto mb-8 max-w-3xl text-xl leading-relaxed text-gray-600 md:text-xl dark:text-gray-300">
						Sharkly is an AI-powered search assistant that does SEO for non-SEO people. Build your
						strategy, generate optimized content, and get expert-level results without becoming an
						expert.
					</p>

					{/* CTA Buttons */}
					<div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Link to="/signup">
							<button className="bg-brand-500 hover:bg-brand-600 shadow-theme-lg hover:shadow-theme-xl inline-flex items-center rounded-lg px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:scale-105">
								Start free trial
								<ArrowRight className="ml-2 h-5 w-5" />
							</button>
						</Link>
						<button
							className="hover:border-brand-500 dark:hover:border-brand-400 hover:text-brand-500 dark:hover:text-brand-400 inline-flex items-center gap-3 rounded-lg border-2 border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 transition-all duration-200 dark:border-gray-600 dark:text-gray-300"
							onClick={() => {
								setIntroOpen(true);
								const video = videoRef.current;
								if (video) {
									void video.play();
								}
								setIsPlaying(true);
							}}
						>
							<Play className="h-5 w-5" />
							Watch Intro
						</button>
					</div>

					{/* Feature Icons */}
					<div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3">
						<div className="flex flex-col items-center">
							<div className="bg-brand-100 dark:bg-brand-500/20 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
								<MessageSquare className="text-brand-500 dark:text-brand-400 h-8 w-8" />
							</div>
							<h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Deep Search</h3>
							<p className="text-center text-sm text-gray-600 dark:text-gray-400">
								Access social media, web, breaches in one place
							</p>
						</div>

						<div className="flex flex-col items-center">
							<div className="bg-blue-light-100 dark:bg-blue-light-500/20 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
								<Users className="text-blue-light-500 dark:text-blue-light-400 h-8 w-8" />
							</div>
							<h3 className="mb-2 font-semibold text-gray-900 dark:text-white">OSINT Graphs</h3>
							<p className="text-center text-sm text-gray-600 dark:text-gray-400">
								See links across people, assets, and entities
							</p>
						</div>

						<div className="flex flex-col items-center">
							<div className="bg-success-100 dark:bg-success-500/20 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
								<Zap className="text-success-500 dark:text-success-400 h-8 w-8" />
							</div>
							<h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Real‑time Intel</h3>
							<p className="text-center text-sm text-gray-600 dark:text-gray-400">
								Monitor threats and updates continuously
							</p>
						</div>
					</div>
				</div>
			</div>
			<Lightbox open={introOpen} onClose={closeIntro} ariaLabel="Paperboat intro video">
				<div className="flex flex-col">
					<video
						ref={videoRef}
						src="/videos/paperboatcrm-intro.mp4"
						autoPlay
						playsInline
						onTimeUpdate={handleTimeUpdate}
						onLoadedMetadata={handleLoadedMetadata}
						onPause={() => setIsPlaying(false)}
						onPlay={() => setIsPlaying(true)}
						className="aspect-video w-full bg-black"
					/>
					<div className="flex items-center justify-between gap-4 bg-gradient-to-r from-gray-950 via-gray-900 to-black px-6 py-4">
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={togglePlay}
								className="hover:bg-brand-500 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-900 transition hover:text-white"
								aria-label={isPlaying ? 'Pause intro video' : 'Play intro video'}
							>
								{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
							</button>
							<button
								type="button"
								onClick={toggleMute}
								className="hover:border-brand-400 hover:text-brand-300 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition"
								aria-label={isMuted ? 'Unmute intro video' : 'Mute intro video'}
							>
								{isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
							</button>
							<input
								type="range"
								min={0}
								max={1}
								step={0.05}
								value={volume}
								onChange={handleVolumeChange}
								className="accent-brand-400 h-1 w-28"
								aria-label="Volume"
							/>
							<button
								type="button"
								onClick={handleReplay}
								className="hover:border-brand-400 hover:text-brand-300 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition"
								aria-label="Replay intro video"
							>
								<RotateCcw className="h-5 w-5" />
							</button>
						</div>
						<div className="flex flex-1 items-center gap-4">
							<input
								type="range"
								min={0}
								max={duration || 0}
								step={0.1}
								value={progress}
								onChange={handleScrub}
								className="accent-brand-400 flex-1"
								aria-label="Video progress"
							/>
							<span className="w-16 text-right text-sm font-medium text-white/80">
								{formattedTime}
							</span>
						</div>
					</div>
				</div>
			</Lightbox>
		</section>
	);
};

export default Hero;
