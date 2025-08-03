import { createContext, useContext } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';

export interface UserProfile extends User {
	id: string;
	email: string;
	avatar: string;
	completed_onboarding: boolean;
	first_name: string;
	last_name: string;
	organization_id: string;
	role: string;
}

export enum AuthLoadingState {
	LOADING = 'LOADING',
	IDLE = 'IDLE'
}

interface AuthContextType {
	user: UserProfile | null;
	session: Session | null;
	error: AuthError | null;
	loadingState: AuthLoadingState;
	signIn: (email: string, password: string) => Promise<void>;
	signUp: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	message: string | null;
	updateUser: () => Promise<void>;
	resetAuthState: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}; 