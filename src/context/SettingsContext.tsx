import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, defaultSettings } from '../types/settings';

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (updates: Partial<AppSettings>) => void;
    resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(() => {
        // Load from localStorage
        const saved = localStorage.getItem('framex-settings');
        if (saved) {
            try {
                return { ...defaultSettings, ...JSON.parse(saved) };
            } catch {
                return defaultSettings;
            }
        }
        return defaultSettings;
    });

    const updateSettings = (updates: Partial<AppSettings>) => {
        setSettings(prev => {
            const newSettings = { ...prev, ...updates };
            localStorage.setItem('framex-settings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
        localStorage.setItem('framex-settings', JSON.stringify(defaultSettings));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
}
