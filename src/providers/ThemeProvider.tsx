import { Theme, ThemeContext } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [theme, setTheme] = useState<Theme>('light');
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		// This code will only run on the client side
		const savedTheme = localStorage.getItem('theme') as Theme | null;
		const initialTheme = savedTheme || 'light'; // Default to light theme

		setTheme(initialTheme);
		setIsInitialized(true);
	}, []);

	useEffect(() => {
		if (isInitialized) {
			localStorage.setItem('theme', theme);
			if (theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
	}, [theme, isInitialized]);

	const toggleTheme = (theme: Theme | null = null) => {
		if (theme) {
			setTheme(theme);
		} else {
			setTheme((prevTheme: Theme) => (prevTheme === 'light' ? 'dark' : 'light'));
		}
	};

	return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
