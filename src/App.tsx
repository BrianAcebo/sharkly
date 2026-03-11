import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import SignIn from './pages/Auth/SignIn';
import SignUp from './pages/Auth/SignUp';
import NotFound from './pages/Error/NotFound';
import AppLayout from './layout/AppLayout';
import MarketingLayout from './layout/MarketingLayout';
import { ScrollToTop } from './components/common/ScrollToTop';
import Home from './pages/Home';
import OAuthCallback from './pages/Oauth/Callback';
import GSCSelectProperty from './pages/GSCSelectProperty';
import { Toaster } from 'sonner';
import AuthLayout from './layout/AuthLayout';
import Onboarding from './pages/Onboarding';
import Assistant from './pages/Assistant';
import ErrorBoundary from './components/common/ErrorBoundary';
import OrganizationRequired from './pages/Organization/OrganizationRequired';
import Organization from './pages/Organization/Organization';
import InviteAccept from './pages/Organization/InviteAccept';
import Confirm from './pages/Auth/Confirm';
import SettingsLayout from './layout/SettingsLayout';
import SettingsIntegrations from './pages/SettingsIntegrations';
import SettingsCredits from './pages/SettingsCredits';
import SettingsBrandVoice from './pages/SettingsBrandVoice';
import SettingsTeam from './pages/SettingsTeam';
import SettingsNotifications from './pages/SettingsNotifications';
import SettingsProfile from './pages/SettingsProfile';
import Notifications from './pages/Notifications';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Billing from './pages/Billing';
import BillingOnboarding from './pages/BillingOnboarding';
import LogoutPage from './pages/Logout';
import Dashboard from './pages/Dashboard';
import Strategy from './pages/Strategy';
import StrategyTargetsOverview from './pages/StrategyTargetsOverview';
import StrategyTargetDetail from './pages/StrategyTargetDetail';
import Clusters from './pages/Clusters';
import ClusterDetail from './pages/ClusterDetail';
import Workspace from './pages/Workspace';
import Performance from './pages/Performance';
import Rankings from './pages/Rankings';
import Technical from './pages/Technical';
import Calendar from './pages/Calendar';
import Sites from './pages/Sites';
import RefundAdmin from './pages/Admin/RefundAdmin';
import StripeAudit from './pages/Admin/StripeAudit';
import AdminDashboard from './pages/Admin/AdminDashboard';
import BlogAdmin from './pages/Admin/BlogAdmin';
import BlogEditor from './pages/Admin/BlogEditor';
import BlogCategories from './pages/Admin/BlogCategories';
import AuditResults from './pages/AuditResults';
import SchemaGenerator from './pages/SchemaGenerator';

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
						<Route path="/dashboard" element={<Dashboard />} />
						<Route path="/strategy" element={<Strategy />}>
							<Route index element={<StrategyTargetsOverview />} />
							<Route path=":targetId" element={<StrategyTargetDetail />} />
						</Route>
						<Route path="/clusters" element={<Clusters />} />
						<Route path="/clusters/:id" element={<ClusterDetail />} />
						<Route path="/workspace/:id" element={<Workspace />} />
						<Route path="/performance" element={<Performance />} />
						<Route path="/rankings" element={<Rankings />} />
					<Route path="/technical" element={<Technical />} />
					<Route path="/schema-generator" element={<SchemaGenerator />} />
					<Route path="/audit/:siteId" element={<AuditResults />} />
					<Route path="/calendar" element={<Calendar />} />
					<Route path="/projects" element={<Navigate to="/sites" replace />} />
						<Route path="/sites" element={<Sites />} />
						<Route path="/settings" element={<SettingsLayout />}>
							<Route index element={<Navigate to="integrations" replace />} />
							<Route path="integrations" element={<SettingsIntegrations />} />
							<Route path="credits" element={<SettingsCredits />} />
							<Route path="brand-voice" element={<SettingsBrandVoice />} />
							<Route path="team" element={<SettingsTeam />} />
							<Route path="notifications" element={<SettingsNotifications />} />
							<Route path="profile" element={<SettingsProfile />} />
						</Route>
						<Route path="/notifications" element={<Notifications />} />
						<Route path="/assistant" element={<Assistant />} />
						<Route path="/assistant/:chatId" element={<Assistant />} />
						<Route path="/onboarding" element={<Onboarding />} />
						<Route path="/billing" element={<Billing />} />
						<Route path="/billing-onboarding" element={<BillingOnboarding />} />
						<Route path="/organization-required" element={<OrganizationRequired />} />
						<Route path="/organization" element={<Organization />} />
						<Route path="/admin" element={<AdminDashboard />} />
						<Route path="/admin/refunds" element={<RefundAdmin />} />
						<Route path="/admin/stripe" element={<StripeAudit />} />
						<Route path="/admin/blog" element={<BlogAdmin />} />
						<Route path="/admin/blog/new" element={<BlogEditor />} />
						<Route path="/admin/blog/edit/:id" element={<BlogEditor />} />
						<Route path="/admin/blog/categories" element={<BlogCategories />} />
					</Route>

					{/* Auth Layout */}
					<Route element={<AuthLayout />}>
						<Route path="/signin" element={<SignIn />} />
						<Route path="/signup" element={<SignUp />} />
					</Route>

					{/* Auth Confirm Route - accessible without full auth */}
					<Route path="/auth/confirm" element={<Confirm />} />

					{/* OAuth Callbacks */}
					<Route path="/oauth/callback" element={<OAuthCallback />} />
					<Route path="/gsc-select-property" element={<GSCSelectProperty />} />

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
