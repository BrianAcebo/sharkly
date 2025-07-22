import PageMeta from '../../components/common/PageMeta';
import SignInForm from '../../components/auth/SignInForm';

export default function SignIn() {
	return (
		<>
			<PageMeta noIndex title="Sign In" description="Sign in to your account" />
			<SignInForm />
		</>
	);
}
