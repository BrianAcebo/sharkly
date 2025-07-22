import PageMeta from '../../components/common/PageMeta';
import SignUpForm from '../../components/auth/SignUpForm';

export default function SignUp() {
	return (
		<>
			<PageMeta noIndex title="Sign Up" description="Sign up to Paperboat CRM" />
			<SignUpForm />
		</>
	);
}
