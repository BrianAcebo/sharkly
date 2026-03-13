import { createContext, MouseEventHandler } from 'react';

export type Theme = 'light' | 'dark';

export type ThemeContextType = {
	theme: Theme;
	toggleTheme: (theme?: Theme | null) => void | MouseEventHandler<HTMLButtonElement>;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
