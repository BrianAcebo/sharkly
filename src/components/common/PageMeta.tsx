import { HelmetProvider, Helmet } from 'react-helmet-async';

const PageMeta = ({
	isSmallTitle,
	title,
	description,
	noIndex
}: {
	isSmallTitle?: boolean;
	title: string;
	description: string;
	noIndex?: boolean;
}) => (
	<Helmet>
		<title>{isSmallTitle ? title : `${title} | Sharkly`}</title>
		<meta name="description" content={description} />
		{noIndex && <meta name="robots" content="noindex, nofollow, noarchive" />}
	</Helmet>
);

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
	<HelmetProvider>{children}</HelmetProvider>
);

export default PageMeta;
