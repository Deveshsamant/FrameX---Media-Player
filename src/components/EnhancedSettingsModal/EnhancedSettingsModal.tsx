import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { X, Palette, Play, Layout, Info, Check, Brain, Keyboard } from 'lucide-react';
import KeyboardShortcutsEditor from '../KeyboardShortcutsEditor/KeyboardShortcutsEditor';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';

interface EnhancedSettingsModalProps {
    onClose: () => void;
    isPlayerActive: boolean;
}

interface Track {
    id: number;
    type: string;
    title?: string;
    lang?: string;
    selected: boolean;
}

export default function EnhancedSettingsModal({ onClose, isPlayerActive }: EnhancedSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'themes' | 'playback' | 'ui' | 'shortcuts' | 'ai' | 'about'>(isPlayerActive ? 'playback' : 'themes');
    const { theme, setTheme, allThemes } = useTheme();
    const { settings, updateSettings, resetSettings } = useSettings();

    // Playback State
    const [tracks, setTracks] = useState<Track[]>([]);
    const [subDelay, setSubDelay] = useState(0);
    const [subScale, setSubScale] = useState(1.0);
    const [speed, setSpeed] = useState(settings.defaultSpeed);
    const [hwDec, setHwDec] = useState(settings.hardwareAcceleration);

    useEffect(() => {
        if (!isPlayerActive) return;

        // Listen for tracks
        const unlisten = listen<Track[]>('mpv-tracks', (e) => {
            setTracks(e.payload);
        });

        // Fetch initial tracks
        invoke('mpv_get_tracks');

        return () => { unlisten.then(f => f()); };
    }, [isPlayerActive]);

    const handleSubTrack = (id: number | string) => {
        invoke('mpv_set_subtitle', { sid: String(id) });
        setTracks(prev => prev.map(t =>
            t.type === 'sub' ? { ...t, selected: String(t.id) === String(id) } : t
        ));
    };

    const handleAudioTrack = (id: number | string) => {
        invoke('mpv_set_audio', { aid: String(id) });
        setTracks(prev => prev.map(t =>
            t.type === 'audio' ? { ...t, selected: String(t.id) === String(id) } : t
        ));
    };

    const updateSubDelay = (val: number) => {
        setSubDelay(val);
        invoke('mpv_set_sub_delay', { delay: val });
    };

    const updateSubScale = (val: number) => {
        setSubScale(val);
        invoke('mpv_set_sub_scale', { scale: val });
    };

    const updateSpeed = (val: number) => {
        setSpeed(val);
        invoke('mpv_set_speed', { speed: val });
    };

    const updateAspectRatio = (ratio: string) => {
        updateSettings({ aspectRatio: ratio });
        invoke('mpv_set_aspect_ratio', { ratio });
    };

    const toggleHwDec = () => {
        const newVal = !hwDec;
        setHwDec(newVal);
        updateSettings({ hardwareAcceleration: newVal });
        invoke('mpv_set_hwdec', { enable: newVal });
    };

    const updateLoop = (mode: 'off' | 'one' | 'all') => {
        updateSettings({ loopMode: mode });
        invoke('mpv_set_loop', { mode });
    }

    const subTracks = tracks.filter(t => t.type === 'sub');
    const audioTracks = tracks.filter(t => t.type === 'audio');


    const tabs = [
        { id: 'themes' as const, label: 'Themes', icon: Palette },
        { id: 'playback' as const, label: 'Playback', icon: Play },
        { id: 'ui' as const, label: 'UI', icon: Layout },
        { id: 'shortcuts' as const, label: 'Shortcuts', icon: Keyboard },
        { id: 'ai' as const, label: 'AI', icon: Brain },
        { id: 'about' as const, label: 'About', icon: Info },
    ];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-2xl shadow-2xl animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: `${theme.colors.bgSecondary}ee`,
                    borderColor: theme.colors.border,
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}20` }}>
                            <Palette size={28} style={{ color: theme.colors.primary }} />
                        </div>
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 px-8 pt-6 border-b border-white/5">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className="flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-t-lg transition-all"
                            style={{
                                color: activeTab === id ? theme.colors.primary : theme.colors.textMuted,
                                backgroundColor: activeTab === id ? `${theme.colors.primary}15` : 'transparent',
                                borderBottom: activeTab === id ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
                            }}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    {activeTab === 'themes' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-4">Choose Your Theme</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {allThemes.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                setTheme(t.id);
                                                updateSettings({ themeId: t.id });
                                            }}
                                            className="group relative p-4 rounded-xl border-2 transition-all hover:scale-105"
                                            style={{
                                                backgroundColor: t.colors.bgSecondary,
                                                borderColor: theme.id === t.id ? theme.colors.primary : t.colors.border,
                                            }}
                                        >
                                            {theme.id === t.id && (
                                                <div
                                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                                                    style={{ backgroundColor: theme.colors.primary }}
                                                >
                                                    <Check size={14} className="text-white" />
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-2">
                                                <div
                                                    className="h-16 rounded-lg"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${t.colors.gradientFrom}, ${t.colors.gradientTo})`,
                                                    }}
                                                />
                                                <p className="text-sm font-medium text-white text-center">{t.name}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'playback' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-4">Playback Settings</h3>

                                {isPlayerActive && (
                                    <div className="space-y-6 mb-8 pb-8 border-b border-white/10">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4">Current Media Controls</h4>

                                        {/* Subtitles */}
                                        <div className="space-y-3">
                                            <h5 className="text-white font-medium">Subtitles</h5>
                                            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-2 bg-white/5 rounded-lg p-2 custom-scrollbar">
                                                <button
                                                    onClick={() => handleSubTrack("no")}
                                                    className={`flex items-center justify-between w-full p-2 rounded text-sm transition-colors ${!subTracks.some(t => t.selected) ? 'bg-violet-500/20 text-violet-300' : 'text-slate-300 hover:bg-white/10'}`}
                                                >
                                                    <span>Off</span>
                                                    {!subTracks.some(t => t.selected) && <Check size={14} />}
                                                </button>
                                                {subTracks.map(t => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => handleSubTrack(t.id)}
                                                        className={`flex items-center justify-between w-full p-2 rounded text-sm transition-colors ${t.selected ? 'bg-violet-500/20 text-violet-300' : 'text-slate-300 hover:bg-white/10'}`}
                                                    >
                                                        <span className="truncate">{t.title || `Track ${t.id}`} ({t.lang || 'unk'})</span>
                                                        {t.selected && <Check size={14} />}
                                                    </button>
                                                ))}
                                                {subTracks.length === 0 && <div className="text-white/30 text-sm italic px-2">No subtitles found</div>}
                                            </div>

                                            {/* Subtitle Settings */}
                                            <div className="grid grid-cols-2 gap-4 mt-2">
                                                <div className="p-3 bg-white/5 rounded-lg">
                                                    <div className="flex justify-between text-xs mb-2">
                                                        <span className="text-slate-400">Delay</span>
                                                        <span className="text-white">{subDelay > 0 ? '+' : ''}{subDelay.toFixed(1)}s</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={-5} max={5} step={0.1} value={subDelay}
                                                        onChange={(e) => updateSubDelay(parseFloat(e.target.value))}
                                                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-violet-500"
                                                    />
                                                </div>
                                                <div className="p-3 bg-white/5 rounded-lg">
                                                    <div className="flex justify-between text-xs mb-2">
                                                        <span className="text-slate-400">Size</span>
                                                        <span className="text-white">{(subScale * 100).toFixed(0)}%</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0.5} max={2.0} step={0.1} value={subScale}
                                                        onChange={(e) => updateSubScale(parseFloat(e.target.value))}
                                                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-violet-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Audio Tracks */}
                                        <div className="space-y-3">
                                            <h5 className="text-white font-medium">Audio Track</h5>
                                            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-2 bg-white/5 rounded-lg p-2 custom-scrollbar">
                                                {audioTracks.map(t => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => handleAudioTrack(t.id)}
                                                        className={`flex items-center justify-between w-full p-2 rounded text-sm transition-colors ${t.selected ? 'bg-violet-500/20 text-violet-300' : 'text-slate-300 hover:bg-white/10'}`}
                                                    >
                                                        <span className="truncate">{t.title || `Track ${t.id}`} ({t.lang || 'unk'})</span>
                                                        {t.selected && <Check size={14} />}
                                                    </button>
                                                ))}
                                                {audioTracks.length === 0 && <div className="text-white/30 text-sm italic px-2">No audio tracks found</div>}
                                            </div>
                                        </div>

                                        {/* Speed & Aspect Ratio */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-white/5 rounded-lg">
                                                <h5 className="text-white font-medium mb-3">Playback Speed ({speed}x)</h5>
                                                <input
                                                    type="range"
                                                    min={0.25} max={5.0} step={0.25} value={speed}
                                                    onChange={(e) => updateSpeed(parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-violet-500"
                                                />
                                            </div>
                                            <div className="p-4 bg-white/5 rounded-lg">
                                                <h5 className="text-white font-medium mb-3">Aspect Ratio</h5>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['-1', '16:9', '4:3', '2.35:1'].map((ratio) => (
                                                        <button
                                                            key={ratio}
                                                            onClick={() => updateAspectRatio(ratio)}
                                                            className={`px-2 py-1.5 rounded text-xs transition-colors ${settings.aspectRatio === ratio ? 'bg-violet-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
                                                        >
                                                            {ratio === '-1' ? 'Auto' : ratio}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hardware Acceleration */}
                                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                            <span className="text-white font-medium">Hardware Acceleration</span>
                                            <button
                                                onClick={toggleHwDec}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${hwDec ? 'bg-violet-600' : 'bg-white/10'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hwDec ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4">Default Settings</h4>

                                    {/* Default Volume */}
                                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-white font-medium">Default Volume</label>
                                            <span className="text-sm" style={{ color: theme.colors.primary }}>{settings.defaultVolume}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={settings.defaultVolume}
                                            onChange={(e) => updateSettings({ defaultVolume: parseInt(e.target.value) })}
                                            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                            style={{
                                                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${settings.defaultVolume}%, rgba(255,255,255,0.1) ${settings.defaultVolume}%, rgba(255,255,255,0.1) 100%)`,
                                            }}
                                        />
                                    </div>

                                    {/* Loop Mode */}
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                        <div>
                                            <p className="text-white font-medium">Loop Mode</p>
                                            <p className="text-sm text-slate-400">Repeat playback behavior</p>
                                        </div>
                                        <div className="flex bg-black/20 rounded-lg p-1 gap-1">
                                            {(['off', 'one', 'all'] as const).map((mode) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => updateLoop(mode)}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${settings.loopMode === mode ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    {mode === 'off' ? 'Off' : mode === 'one' ? 'Single' : 'All'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Auto Play */}
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                        <div>
                                            <p className="text-white font-medium">Auto-Play</p>
                                            <p className="text-sm text-slate-400">Start playing immediately when file opens</p>
                                        </div>
                                        <button
                                            onClick={() => updateSettings({ autoPlay: !settings.autoPlay })}
                                            className="relative w-14 h-7 rounded-full transition-colors"
                                            style={{
                                                backgroundColor: settings.autoPlay ? theme.colors.primary : '#374151',
                                            }}
                                        >
                                            <div
                                                className="absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform"
                                                style={{
                                                    transform: settings.autoPlay ? 'translateX(30px)' : 'translateX(2px)',
                                                }}
                                            />
                                        </button>
                                    </div>

                                    {/* Remember Position */}
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                        <div>
                                            <p className="text-white font-medium">Remember Position</p>
                                            <p className="text-sm text-slate-400">Resume from last position</p>
                                        </div>
                                        <button
                                            onClick={() => updateSettings({ rememberPosition: !settings.rememberPosition })}
                                            className="relative w-14 h-7 rounded-full transition-colors"
                                            style={{
                                                backgroundColor: settings.rememberPosition ? theme.colors.primary : '#374151',
                                            }}
                                        >
                                            <div
                                                className="absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform"
                                                style={{
                                                    transform: settings.rememberPosition ? 'translateX(30px)' : 'translateX(2px)',
                                                }}
                                            />
                                        </button>
                                    </div>

                                    {/* Default Speed */}
                                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                        <label className="text-white font-medium mb-2 block">Default Playback Speed</label>
                                        <select
                                            value={settings.defaultSpeed}
                                            onChange={(e) => updateSettings({ defaultSpeed: parseFloat(e.target.value) })}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white appearance-none cursor-pointer outline-none focus:border-white/30 transition-colors"
                                            style={{
                                                backgroundColor: `${theme.colors.cardBg}`,
                                                color: theme.colors.text
                                            }}
                                        >
                                            {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map(speed => (
                                                <option key={speed} value={speed} style={{ backgroundColor: theme.colors.cardBg, color: theme.colors.text }}>{speed}x</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}        {activeTab === 'ui' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-4">UI Preferences</h3>
                                <div className="space-y-4">
                                    {/* Auto-hide Delay */}
                                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-white font-medium">Auto-Hide Controls Delay</label>
                                            <span className="text-sm" style={{ color: theme.colors.primary }}>{settings.autoHideDelay}ms</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="500"
                                            max="5000"
                                            step="100"
                                            value={settings.autoHideDelay}
                                            onChange={(e) => updateSettings({ autoHideDelay: parseInt(e.target.value) })}
                                            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                            style={{
                                                background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${((settings.autoHideDelay - 500) / 4500) * 100}%, rgba(255,255,255,0.1) ${((settings.autoHideDelay - 500) / 4500) * 100}%, rgba(255,255,255,0.1) 100%)`,
                                            }}
                                        />
                                    </div>

                                    {/* Show Feature Cards */}
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                        <div>
                                            <p className="text-white font-medium">Show Feature Cards</p>
                                            <p className="text-sm text-slate-400">Display feature cards on home screen</p>
                                        </div>
                                        <button
                                            onClick={() => updateSettings({ showFeatureCards: !settings.showFeatureCards })}
                                            className="relative w-14 h-7 rounded-full transition-colors"
                                            style={{
                                                backgroundColor: settings.showFeatureCards ? theme.colors.primary : '#374151',
                                            }}
                                        >
                                            <div
                                                className="absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform"
                                                style={{
                                                    transform: settings.showFeatureCards ? 'translateX(30px)' : 'translateX(2px)',
                                                }}
                                            />
                                        </button>
                                    </div>

                                    {/* Animation Speed */}
                                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                        <label className="text-white font-medium mb-2 block">Animation Speed</label>
                                        <select
                                            value={settings.animationSpeed}
                                            onChange={(e) => updateSettings({ animationSpeed: e.target.value as 'slow' | 'normal' | 'fast' })}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white appearance-none cursor-pointer outline-none focus:border-white/30 transition-colors"
                                            style={{
                                                backgroundColor: `${theme.colors.cardBg}`,
                                                color: theme.colors.text
                                            }}
                                        >
                                            <option value="slow" style={{ backgroundColor: theme.colors.cardBg, color: theme.colors.text }}>Slow</option>
                                            <option value="normal" style={{ backgroundColor: theme.colors.cardBg, color: theme.colors.text }}>Normal</option>
                                            <option value="fast" style={{ backgroundColor: theme.colors.cardBg, color: theme.colors.text }}>Fast</option>
                                        </select>
                                    </div>

                                    {/* Library View */}
                                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                        <label className="text-white font-medium mb-2 block">Default Library View</label>
                                        <select
                                            value={settings.defaultLibraryView}
                                            onChange={(e) => updateSettings({ defaultLibraryView: e.target.value as 'grid' | 'list' })}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white appearance-none cursor-pointer outline-none focus:border-white/30 transition-colors"
                                            style={{
                                                backgroundColor: `${theme.colors.cardBg}`,
                                                color: theme.colors.text
                                            }}
                                        >
                                            <option value="grid" style={{ backgroundColor: theme.colors.cardBg, color: theme.colors.text }}>Grid</option>
                                            <option value="list" style={{ backgroundColor: theme.colors.cardBg, color: theme.colors.text }}>List</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'shortcuts' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-4">Keyboard Shortcuts</h3>
                                <p className="text-sm text-slate-400 mb-4">Click on a key binding, then press the new key to remap it.</p>
                                <KeyboardShortcutsEditor />
                            </div>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-4">AI Features</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 bg-green-500/20 rounded-lg">
                                                <Brain size={24} className="text-green-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-medium">Local AI Processing</h4>
                                                <p className="text-sm text-slate-400">Powered by OpenAI Whisper</p>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                            <p className="text-sm text-blue-200">
                                                Subtitle generation is handled locally on your device. No API keys or cloud services required. Proivacy focused.
                                            </p>
                                        </div>

                                        <div className="mt-4">
                                            <h5 className="text-sm font-semibold text-white mb-2">Requirements</h5>
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                                                <span>Python 3.8+ installed</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                                                <span><code>pip install openai-whisper</code></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {activeTab === 'about' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-4">About FrameX</h3>
                                <div className="space-y-4">
                                    <div className="p-6 bg-white/5 rounded-lg border border-white/5">
                                        <p className="text-lg text-slate-300 mb-4">
                                            A modern, high-fidelity video player built for the ultimate cinematic experience.
                                        </p>
                                        <div className="space-y-2 text-sm text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                                                Powered by libmpv for professional-grade playback
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.secondary }} />
                                                Built with Tauri 2.0, React, and TypeScript
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                                                Supports all major video formats
                                            </div>
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-white/10">
                                            <p className="text-xs text-slate-500">Version 0.1.0</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={resetSettings}
                                        className="w-full py-3 px-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 font-medium transition-all"
                                    >
                                        Reset All Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:shadow-lg"
                        style={{
                            background: `linear-gradient(135deg, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`,
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
