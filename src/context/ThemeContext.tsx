import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from '../types/theme';
import { themes, getThemeById } from '../themes/presets';

interface ThemeContextType {
    theme: Theme;
    setTheme: (themeId: string) => void;
    allThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
        // Load from localStorage
        return localStorage.getItem('framex-theme') || 'midnight-purple';
    });

    const theme = getThemeById(currentThemeId);

    const setTheme = (themeId: string) => {
        setCurrentThemeId(themeId);
        localStorage.setItem('framex-theme', themeId);
    };

    // Apply theme colors to CSS custom properties
    useEffect(() => {
        const root = document.documentElement;
        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, allThemes: themes }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
