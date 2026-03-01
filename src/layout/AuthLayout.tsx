import GridShape from '../components/common/GridShape';
import { Link, Navigate, Outlet } from 'react-router';
import ThemeTogglerTwo from '../components/common/ThemeTogglerTwo';
import useAuth from '../hooks/useAuth';

export default function AuthLayout() {
	const { session } = useAuth();

	if (session) {
		return <Navigate to="/dashboard" />;
	}

	return (
		<main className="relative z-1 bg-white p-6 sm:p-0 dark:bg-gray-900">
			<div className="relative flex h-screen w-full flex-col justify-center sm:p-0 lg:flex-row dark:bg-gray-900">
				<Outlet />
				<div className="dark relative hidden h-full w-full items-center bg-[url('/images/general/woman-working-on-desk-with-plants.jpg')] bg-cover bg-center lg:grid lg:w-1/2 dark:bg-white/5">
					<div className="absolute inset-0 bg-gray-900/50"></div>
					<div className="relative z-1 flex items-center justify-center">
						{/* <!-- ===== Common Grid Shape Start ===== --> */}
						<GridShape />
						<div className="flex max-w-xs flex-col items-center">
							<Link to="/" className="mb-4 block">
								<img width={300} height={48} src="/images/logos/logo-dark.svg" alt="Logo" />
							</Link>
							<p className="text-center text-white">
								Making SEO easy for non-SEO people. Get expert level results with an AI-powered
								search assistant.
							</p>
						</div>
					</div>
				</div>
				<div className="fixed right-6 bottom-6 z-50 hidden sm:block">
					<ThemeTogglerTwo />
				</div>
			</div>
		</main>
	);
}
