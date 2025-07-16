import { BrowserRouter as Router, Routes, Route } from 'react-router';
import SignIn from './pages/Auth/SignIn';
import SignUp from './pages/Auth/SignUp';
import NotFound from './pages/Error/NotFound';
import AppLayout from './layout/AppLayout';
import MarketingLayout from './layout/MarketingLayout';
import { ScrollToTop } from './components/common/ScrollToTop';
import Home from './pages/Home';
import OAuthCallback from './pages/Oauth/Callback';
import { Toaster } from 'sonner';
import AuthLayout from './layout/AuthLayout';
import Onboarding from './pages/Onboarding';
import Pipeline from './pages/Pipeline';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Email from './pages/Email';
import Assistant from './pages/Assistant'
import Leads from './pages/Leads'

export default function App() {
	return (
		<>
			<Toaster richColors />
			<Router>
				<ScrollToTop />
				<Routes>
					<Route element={<MarketingLayout />}>
						<Route index path="/" element={<Home />} />
					</Route>

					<Route element={<AppLayout />}>
						<Route index path="/pipeline" element={<Pipeline />} />
						<Route path="/profile" element={<Profile />} />
						<Route path="/inbox" element={<Email />} />
						<Route path="/chat" element={<Chat />} />
						<Route path="/assistant" element={<Assistant />} />
            			<Route path="/onboarding" element={<Onboarding />} />
						<Route path="/leads" element={<Leads />} />
					</Route>

					{/* Auth Layout */}
					<Route element={<AuthLayout />}>
						<Route path="/signin" element={<SignIn />} />
						<Route path="/signup" element={<SignUp />} />
					</Route>

					<Route path="/oauth/callback" element={<OAuthCallback />} />

					{/* Fallback Route */}
					<Route path="*" element={<NotFound />} />
				</Routes>
			</Router>
		</>
	);
}
