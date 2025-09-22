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
import ErrorBoundary from './components/common/ErrorBoundary';
import Lead from './pages/Lead';
import OrganizationRequired from './pages/Organization/OrganizationRequired';
import Organization from './pages/Organization/Organization';
import InviteAccept from './pages/Organization/InviteAccept';
import Confirm from './pages/Auth/Confirm';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Tasks from './pages/Tasks';
import CalendarPage from './pages/Calendar';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import NumberSettingsPage from './pages/settings/number';
import LeadSmsPage from './pages/leads/[leadId]/sms';
import Calls from './pages/Calls';
import Billing from './pages/Billing';
import BillingOnboarding from './pages/BillingOnboarding';
import PhoneSmsVerification from './pages/PhoneSmsVerification';

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
						<Route index path="/pipeline" element={<Pipeline />} />
						<Route path="/profile" element={<Profile />} />
						<Route path="/settings" element={<Settings />} />
						<Route path="/settings/number" element={<NumberSettingsPage />} />
						<Route path="/notifications" element={<Notifications />} />
						<Route path="/tasks" element={<Tasks />} />
						<Route path="/tasks/:id" element={<Tasks />} />
						<Route path="/calendar" element={<CalendarPage />} />
						<Route path="/inbox" element={<Email />} />
						<Route path="/chat" element={<Chat />} />
						<Route path="/assistant" element={<Assistant />} />
            			<Route path="/onboarding" element={<Onboarding />} />
						<Route path="/leads" element={<Leads />} />
						<Route path="/leads/:id" element={<Lead />} />
						<Route path="/leads/:leadId/sms" element={<LeadSmsPage />} />
						<Route path="/calls" element={<Calls />} />
						<Route path="/billing" element={<Billing />} />
						<Route path="/billing-onboarding" element={<BillingOnboarding />} />
						<Route path="/phone-sms-verification" element={<PhoneSmsVerification />} />
						<Route path="/organization-required" element={<OrganizationRequired />} />
						<Route path="/organization" element={<Organization />} />
					</Route>

					{/* Auth Layout */}
					<Route element={<AuthLayout />}>
						<Route path="/signin" element={<SignIn />} />
						<Route path="/signup" element={<SignUp />} />
					</Route>

					{/* Auth Confirm Route - accessible without full auth */}
					<Route path="/auth/confirm" element={<Confirm />} />

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
