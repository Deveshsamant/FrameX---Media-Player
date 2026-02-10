import { FolderOpen, Library, Film, MonitorPlay, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

function TiltCard({ children, className, style }: TiltCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xRot = ((y - rect.height / 2) / rect.height) * -10;
        const yRot = ((x - rect.width / 2) / rect.width) * 10;

        setRotation({ x: xRot, y: yRot });
    };

    const handleMouseLeave = () => {
        setRotation({ x: 0, y: 0 });
    };

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
            style={{
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1, 1, 1)`,
                ...style,
            }}
        >
            {children}
        </div>
    );
}

interface HomeScreenProps {
    onOpenFile: () => void;
    onOpenFolder: () => void;
}

export default function HomeScreen({ onOpenFile, onOpenFolder }: HomeScreenProps) {
    const { theme } = useTheme();
    return (
        <div className="h-full overflow-y-auto">
            <div className="min-h-full flex flex-col items-center justify-center px-4 py-12">
                <div className="w-full max-w-7xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center space-y-4 md:space-y-6 mb-12">
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium uppercase tracking-wider shadow-lg animate-fade-in"
                            style={{
                                background: `linear-gradient(to right, ${theme.colors.primary}10, ${theme.colors.secondary}10)`,
                                borderColor: `${theme.colors.primary}20`,
                                color: theme.colors.primaryLight,
                            }}
                        >
                            <Sparkles size={14} className="animate-pulse" /> Next-Gen Player
                        </div>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight animate-fade-in-up">
                            Experience <br />
                            <span
                                className="text-transparent bg-clip-text"
                                style={{
                                    backgroundImage: `linear-gradient(to right, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`,
                                }}
                            >
                                Cinema Grade
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-100" style={{ color: theme.colors.textSecondary }}>
                            FrameX brings high-fidelity playback with a stunning 3D interface. Drop your media and immerse yourself.
                        </p>

                        {/* Primary CTAs */}
                        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-200">
                            <button
                                onClick={onOpenFile}
                                className="group relative px-10 py-5 rounded-2xl font-bold text-white text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
                                style={{
                                    background: `linear-gradient(135deg, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`,
                                    boxShadow: `0 20px 60px ${theme.colors.primary}30`,
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 skew-x-12 translate-x-[-200%] group-hover:animate-shine" />
                                <span className="relative flex items-center gap-3">
                                    <FolderOpen size={24} /> Open Media
                                </span>
                            </button>
                            <button
                                onClick={onOpenFolder}
                                className="px-10 py-5 backdrop-blur-xl rounded-2xl font-semibold text-white text-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-xl"
                                style={{
                                    backgroundColor: `${theme.colors.cardBg}80`,
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: theme.colors.border,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = theme.colors.borderHover;
                                    e.currentTarget.style.backgroundColor = `${theme.colors.cardBg}cc`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = theme.colors.border;
                                    e.currentTarget.style.backgroundColor = `${theme.colors.cardBg}80`;
                                }}
                            >
                                <Library size={24} /> Open Folder
                            </button>
                        </div>
                    </div>

                    {/* Feature Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up delay-300">
                        {/* Keyboard Shortcuts Card */}
                        <TiltCard
                            className="group relative p-6 backdrop-blur-2xl rounded-2xl shadow-2xl transition-all duration-500"
                            style={{
                                background: `linear-gradient(to bottom right, ${theme.colors.cardBg}, ${theme.colors.bgTertiary})`,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: theme.colors.border,
                            }}
                        >
                            <div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ background: `linear-gradient(to bottom right, ${theme.colors.primary}0d, transparent)` }}
                            />
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2 rounded-lg group-hover:scale-110 transition-transform"
                                        style={{ backgroundColor: `${theme.colors.primary}1a` }}
                                    >
                                        <Film size={24} style={{ color: theme.colors.primaryLight }} />
                                    </div>
                                    <h3 className="font-bold text-white text-lg">Shortcuts</h3>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between text-slate-400 hover:text-white transition-colors">
                                        <span>Play/Pause</span>
                                        <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 font-mono text-xs">Space</kbd>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-400 hover:text-white transition-colors">
                                        <span>Volume</span>
                                        <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 font-mono text-xs">↑↓</kbd>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-400 hover:text-white transition-colors">
                                        <span>Seek</span>
                                        <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 font-mono text-xs">←→</kbd>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-400 hover:text-white transition-colors">
                                        <span>Fullscreen</span>
                                        <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 font-mono text-xs">DblClick</kbd>
                                    </div>
                                </div>
                            </div>
                        </TiltCard>

                        {/* Supported Formats Card */}
                        <TiltCard
                            className="group relative p-6 backdrop-blur-2xl rounded-2xl shadow-2xl transition-all duration-500"
                            style={{
                                background: `linear-gradient(to bottom right, ${theme.colors.cardBg}, ${theme.colors.bgTertiary})`,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: theme.colors.border,
                            }}
                        >
                            <div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ background: `linear-gradient(to bottom right, ${theme.colors.secondary}0d, transparent)` }}
                            />
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2 rounded-lg group-hover:scale-110 transition-transform"
                                        style={{ backgroundColor: `${theme.colors.secondary}1a` }}
                                    >
                                        <Film size={24} style={{ color: theme.colors.secondaryLight }} />
                                    </div>
                                    <h3 className="font-bold text-white text-lg">Formats</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {['MP4', 'MKV', 'AVI', 'MOV', 'WEBM', 'FLV', 'WMV'].map(format => (
                                        <span
                                            key={format}
                                            className="px-3 py-1.5 rounded-lg text-xs font-mono border hover:scale-110 transition-all cursor-default"
                                            style={{
                                                backgroundColor: `${theme.colors.secondary}1a`,
                                                color: theme.colors.secondaryLight,
                                                borderColor: `${theme.colors.secondary}33`,
                                            }}
                                        >
                                            {format}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </TiltCard>

                        {/* Quick Features Card */}
                        <TiltCard
                            className="group relative p-6 backdrop-blur-2xl rounded-2xl shadow-2xl transition-all duration-500"
                            style={{
                                background: `linear-gradient(to bottom right, ${theme.colors.cardBg}, ${theme.colors.bgTertiary})`,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: theme.colors.border,
                            }}
                        >
                            <div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ background: `linear-gradient(to bottom right, ${theme.colors.accent}0d, transparent)` }}
                            />
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2 rounded-lg group-hover:scale-110 transition-transform"
                                        style={{ backgroundColor: `${theme.colors.accent}1a` }}
                                    >
                                        <MonitorPlay size={24} style={{ color: theme.colors.accent }} />
                                    </div>
                                    <h3 className="font-bold text-white text-lg">Features</h3>
                                </div>
                                <ul className="space-y-2 text-sm" style={{ color: theme.colors.textMuted }}>
                                    <li className="flex items-center gap-2 hover:text-white transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                                        MPV Integration
                                    </li>
                                    <li className="flex items-center gap-2 hover:text-white transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                                        Subtitle Support
                                    </li>
                                    <li className="flex items-center gap-2 hover:text-white transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                                        Speed Control
                                    </li>
                                    <li className="flex items-center gap-2 hover:text-white transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                                        Library View
                                    </li>
                                </ul>
                            </div>
                        </TiltCard>

                        {/* About Card */}
                        <TiltCard
                            className="group relative p-6 backdrop-blur-2xl rounded-2xl shadow-2xl transition-all duration-500"
                            style={{
                                background: `linear-gradient(to bottom right, ${theme.colors.cardBg}, ${theme.colors.bgTertiary})`,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: theme.colors.border,
                            }}
                        >
                            <div
                                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ background: `linear-gradient(to bottom right, ${theme.colors.primary}0d, transparent)` }}
                            />
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2 rounded-lg group-hover:scale-110 transition-transform"
                                        style={{ backgroundColor: `${theme.colors.primary}1a` }}
                                    >
                                        <Sparkles size={24} style={{ color: theme.colors.primary }} />
                                    </div>
                                    <h3 className="font-bold text-white text-lg">About</h3>
                                </div>
                                <p className="text-sm leading-relaxed" style={{ color: theme.colors.textMuted }}>
                                    Built with Tauri, React, and libmpv for the ultimate cinematic experience.
                                </p>
                                <div className="pt-2 flex items-center gap-2">
                                    <span className="text-xs font-mono" style={{ color: theme.colors.textMuted }}>Version 0.1.0</span>
                                    <div
                                        className="flex-1 h-px"
                                        style={{ background: `linear-gradient(to right, ${theme.colors.primary}80, transparent)` }}
                                    />
                                </div>
                            </div>
                        </TiltCard>
                    </div>


                </div>
            </div>
        </div>
    );
}
