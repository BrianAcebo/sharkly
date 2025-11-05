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
import Assistant from './pages/Assistant'
import Cases from './pages/Cases/Cases';
import ErrorBoundary from './components/common/ErrorBoundary';
import OrganizationRequired from './pages/Organization/OrganizationRequired';
import Organization from './pages/Organization/Organization';
import InviteAccept from './pages/Organization/InviteAccept';
import Confirm from './pages/Auth/Confirm';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Billing from './pages/Billing';
import BillingOnboarding from './pages/BillingOnboarding';
import LogoutPage from './pages/Logout';
import Search from './pages/Search';
import CaseDetail from './pages/Cases/CaseDetail';
import Graph from './pages/Graph/Graph';
import PersonDetail from './pages/People/PersonDetail';
import PeoplePage from './pages/People/People';
import InvestigatorProfile from './pages/Investigators/InvestigatorProfile';
import InvestigatorDetail from './pages/Investigators/InvestigatorDetail';

export default function App() {
	return (
		<ErrorBoundary>
			<Toaster richColors />
			<Router>
				<ScrollToTop />
				<Routes>
					<Route element={<MarketingLayout />}>
						<Route index path="/" element={<Home />} />
						<Route path="/privacy" element={<PrivacyPolicy />} />
						<Route path="/terms" element={<TermsOfService />} />
					</Route>

					<Route element={<AppLayout />}>
						<Route index path="/cases" element={<Cases />} />
						<Route path="/cases/:id" element={<CaseDetail />} />
                        <Route path="/graph/:id" element={<Graph />} />
                        <Route path="/people" element={<PeoplePage />} />
                        <Route path="/people/:id" element={<PersonDetail />} />
                        <Route path="/settings" element={<Settings />} />
						<Route path="/notifications" element={<Notifications />} />
						<Route path="/assistant" element={<Assistant />} />
            			<Route path="/onboarding" element={<Onboarding />} />
						<Route path="/billing" element={<Billing />} />
						<Route path="/billing-onboarding" element={<BillingOnboarding />} />
						<Route path="/organization-required" element={<OrganizationRequired />} />
						<Route path="/search" element={<Search />} />
							<Route path="/organization" element={<Organization />} />
							<Route path="/me" element={<InvestigatorProfile />} />
                        <Route path="/investigators/:id" element={<InvestigatorDetail />} />
					</Route>

					{/* Auth Layout */}
					<Route element={<AuthLayout />}>
						<Route path="/signin" element={<SignIn />} />
						<Route path="/signup" element={<SignUp />} />
					</Route>

					{/* Auth Confirm Route - accessible without full auth */}
					<Route path="/auth/confirm" element={<Confirm />} />

					<Route path="/logout" element={<LogoutPage />} />

					{/* Password Reset Routes - accessible without full auth */}
					<Route path="/forgot-password" element={<ForgotPassword />} />
					<Route path="/reset-password" element={<ResetPassword />} />

					{/* Invite Route - should be accessible without full auth */}
					<Route path="/invite/:inviteId" element={<InviteAccept />} />

					<Route path="/oauth/callback" element={<OAuthCallback />} />

					{/* Fallback Route */}
					<Route path="*" element={<NotFound />} />
				</Routes>
			</Router>
		</ErrorBoundary>
	);
}
