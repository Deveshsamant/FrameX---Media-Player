import { useState } from 'react';
import { Palette, Save, RotateCcw, Eye } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ColorField {
    key: string;
    label: string;
    group: string;
}

const COLOR_FIELDS: ColorField[] = [
    { key: 'primary', label: 'Primary', group: 'Brand' },
    { key: 'secondary', label: 'Secondary', group: 'Brand' },
    { key: 'accent', label: 'Accent', group: 'Brand' },
    { key: 'bgPrimary', label: 'Background', group: 'Backgrounds' },
    { key: 'bgSecondary', label: 'Surface', group: 'Backgrounds' },
    { key: 'bgTertiary', label: 'Tertiary', group: 'Backgrounds' },
    { key: 'cardBg', label: 'Card', group: 'Backgrounds' },
    { key: 'textPrimary', label: 'Primary Text', group: 'Text' },
    { key: 'textSecondary', label: 'Secondary Text', group: 'Text' },
    { key: 'textMuted', label: 'Muted Text', group: 'Text' },
    { key: 'border', label: 'Border', group: 'UI' },
    { key: 'borderHover', label: 'Border Hover', group: 'UI' },
    { key: 'gradientFrom', label: 'Gradient Start', group: 'Gradients' },
    { key: 'gradientTo', label: 'Gradient End', group: 'Gradients' },
];

export default function ThemeEditor() {
    const { theme } = useTheme();
    const [customColors, setCustomColors] = useState<Record<string, string>>({ ...theme.colors });
    const [themeName, setThemeName] = useState('My Custom Theme');
    const [showPreview, setShowPreview] = useState(false);

    const handleColorChange = (key: string, value: string) => {
        setCustomColors(prev => ({ ...prev, [key]: value }));
    };

    const saveCustomTheme = () => {
        const customThemes = JSON.parse(localStorage.getItem('framex-custom-themes') || '[]');
        const newTheme = {
            id: `custom-${Date.now()}`,
            name: themeName,
            colors: customColors,
        };
        customThemes.push(newTheme);
        localStorage.setItem('framex-custom-themes', JSON.stringify(customThemes));
    };

    const resetToTheme = () => {
        setCustomColors({ ...theme.colors });
    };

    const groups = [...new Set(COLOR_FIELDS.map(f => f.group))];

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-500/20 rounded-lg">
                        <Palette size={20} className="text-pink-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-white">Theme Editor</h4>
                        <p className="text-xs text-slate-500">Create your own color scheme</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={resetToTheme}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                    >
                        <RotateCcw size={12} /> Reset
                    </button>
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${showPreview ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                    >
                        <Eye size={12} /> Preview
                    </button>
                </div>
            </div>

            {/* Theme Name */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    placeholder="Theme name..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500/50"
                />
                <button
                    onClick={saveCustomTheme}
                    className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Save size={14} /> Save
                </button>
            </div>

            {/* Live Preview */}
            {showPreview && (
                <div
                    className="p-4 rounded-xl border overflow-hidden"
                    style={{
                        backgroundColor: customColors.bgPrimary,
                        borderColor: customColors.border,
                    }}
                >
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: customColors.primary }} />
                            <span className="text-sm font-bold" style={{ color: customColors.textPrimary }}>Preview Title</span>
                        </div>
                        <p className="text-xs" style={{ color: customColors.textSecondary }}>This is how secondary text will look.</p>
                        <div
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: customColors.cardBg, border: `1px solid ${customColors.border}` }}
                        >
                            <span className="text-xs" style={{ color: customColors.textMuted }}>Card content preview</span>
                        </div>
                        <div
                            className="h-2 rounded-full"
                            style={{ background: `linear-gradient(to right, ${customColors.gradientFrom}, ${customColors.gradientTo})` }}
                        />
                        <div className="flex gap-2">
                            <button className="px-3 py-1 rounded text-xs text-white" style={{ backgroundColor: customColors.primary }}>Primary</button>
                            <button className="px-3 py-1 rounded text-xs text-white" style={{ backgroundColor: customColors.secondary }}>Secondary</button>
                            <button className="px-3 py-1 rounded text-xs text-white" style={{ backgroundColor: customColors.accent }}>Accent</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Color Pickers by Group */}
            <div className="space-y-4">
                {groups.map(group => (
                    <div key={group}>
                        <h5 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">{group}</h5>
                        <div className="grid grid-cols-2 gap-2">
                            {COLOR_FIELDS.filter(f => f.group === group).map(field => (
                                <div
                                    key={field.key}
                                    className="flex items-center gap-2.5 p-2.5 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    <div className="relative">
                                        <input
                                            type="color"
                                            value={customColors[field.key] || '#ffffff'}
                                            onChange={(e) => handleColorChange(field.key, e.target.value)}
                                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch-wrapper]:p-0"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs text-white font-medium block">{field.label}</span>
                                        <span className="text-[10px] text-slate-500 font-mono block">{customColors[field.key]}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
