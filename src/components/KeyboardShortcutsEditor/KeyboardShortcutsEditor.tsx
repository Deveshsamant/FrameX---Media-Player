import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import { KeyboardShortcuts, defaultShortcuts, shortcutLabels } from '../../types/settings';

function formatKeyDisplay(key: string): string {
    switch (key) {
        case ' ': return 'Space';
        case 'ArrowUp': return '↑';
        case 'ArrowDown': return '↓';
        case 'ArrowLeft': return '←';
        case 'ArrowRight': return '→';
        case 'Escape': return 'Esc';
        default: return key.length === 1 ? key.toUpperCase() : key;
    }
}

export default function KeyboardShortcutsEditor() {
    const { settings, updateSettings } = useSettings();
    const { theme } = useTheme();
    const [editingAction, setEditingAction] = useState<keyof KeyboardShortcuts | null>(null);

    const shortcuts = settings.keyboardShortcuts || { ...defaultShortcuts };

    const handleKeyCapture = (action: keyof KeyboardShortcuts) => {
        setEditingAction(action);

        const handler = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore modifier-only presses
            if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

            const newShortcuts = { ...shortcuts, [action]: e.key };
            updateSettings({ keyboardShortcuts: newShortcuts });
            setEditingAction(null);
            window.removeEventListener('keydown', handler, true);
        };

        // Use capture to grab the event before anything else
        window.addEventListener('keydown', handler, true);
    };

    const resetToDefaults = () => {
        updateSettings({ keyboardShortcuts: { ...defaultShortcuts } });
    };

    const actions = Object.keys(shortcutLabels) as (keyof KeyboardShortcuts)[];

    return (
        <div className="space-y-4">
            {actions.map((action) => (
                <div
                    key={action}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                >
                    <div>
                        <p className="text-white font-medium text-sm">{shortcutLabels[action]}</p>
                    </div>

                    <button
                        onClick={() => handleKeyCapture(action)}
                        className="min-w-[80px] px-4 py-2 rounded-lg text-sm font-mono font-bold transition-all border"
                        style={{
                            backgroundColor: editingAction === action
                                ? `${theme.colors.primary}30`
                                : 'rgba(255,255,255,0.05)',
                            borderColor: editingAction === action
                                ? theme.colors.primary
                                : 'rgba(255,255,255,0.1)',
                            color: editingAction === action
                                ? theme.colors.primary
                                : '#e2e8f0',
                        }}
                    >
                        {editingAction === action ? (
                            <span className="animate-pulse">Press a key…</span>
                        ) : (
                            formatKeyDisplay(shortcuts[action])
                        )}
                    </button>
                </div>
            ))}

            <button
                onClick={resetToDefaults}
                className="flex items-center gap-2 px-4 py-2.5 mt-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-400 hover:text-white transition-all"
            >
                <RotateCcw size={14} />
                Reset to Defaults
            </button>
        </div>
    );
}
