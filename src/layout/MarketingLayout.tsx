import { SidebarProvider } from '../providers/SidebarProvider';
import { Outlet } from 'react-router';
import MarketingHeader from '../components/home/MarketingHeader';
import MarketingFooter from '../components/home/MarketingFooter';

const LayoutContent: React.FC = () => {
	return (
		<div className="min-h-screen">
			<div className="flex-1 transition-all duration-300 ease-in-out">
				<MarketingHeader />
				<main className="min-h-screen-visible mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
					<Outlet />
				</main>
				<MarketingFooter />
			</div>
		</div>
	);
};

const MarketingLayout: React.FC = () => {
	return (
		<SidebarProvider>
			<LayoutContent />
		</SidebarProvider>
	);
};

export default MarketingLayout;
