import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { X, Type, Monitor, Sliders, Check } from 'lucide-react';

interface Track {
    id: number;
    type: string; // "video", "audio", "sub"
    title?: string;
    lang?: string;
    selected: boolean;
}

interface SettingsModalProps {
    onClose: () => void;
    autoHideDuration: number;
    setAutoHideDuration: (ms: number) => void;
    loopMode: string;
    setLoopMode: (mode: string) => void;
}

export default function SettingsModal({ onClose, autoHideDuration, setAutoHideDuration, loopMode, setLoopMode }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'subs' | 'video' | 'ui'>('subs');
    const [tracks, setTracks] = useState<Track[]>([]);

    // Local State for Values
    const [subDelay, setSubDelay] = useState(0);
    const [subScale, setSubScale] = useState(1.0);
    const [speed, setSpeed] = useState(1.0);
    const [aspectRatio, setAspectRatio] = useState("-1");
    const [hwDec, setHwDec] = useState(true);

    useEffect(() => {
        // Listen for tracks
        const unlisten = listen<Track[]>('mpv-tracks', (e) => {
            setTracks(e.payload);
        });

        // Fetch initial tracks
        invoke('mpv_get_tracks');

        return () => { unlisten.then(f => f()); };
    }, []);

    const handleSubTrack = (id: number | string) => {
        invoke('mpv_set_subtitle', { sid: String(id) });
        // Optimistic update
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
        setAspectRatio(ratio);
        invoke('mpv_set_aspect_ratio', { ratio });
    };

    const toggleHwDec = () => {
        const newVal = !hwDec;
        setHwDec(newVal);
        invoke('mpv_set_hwdec', { enable: newVal });
    };

    const updateLoop = (mode: string) => {
        setLoopMode(mode);
        invoke('mpv_set_loop', { mode });
    }

    // Filtered Tracks
    const subTracks = tracks.filter(t => t.type === 'sub');
    const audioTracks = tracks.filter(t => t.type === 'audio');

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-[500px] h-[600px] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-xl font-semibold text-white">Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 border-b border-white/5">
                    <TabButton active={activeTab === 'subs'} onClick={() => setActiveTab('subs')} icon={<Type size={18} />} label="Subtitles" />
                    <TabButton active={activeTab === 'video'} onClick={() => setActiveTab('video')} icon={<Monitor size={18} />} label="Video & Audio" />
                    <TabButton active={activeTab === 'ui'} onClick={() => setActiveTab('ui')} icon={<Sliders size={18} />} label="Interface" />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">

                    {/* SUBTITLES TAB */}
                    {activeTab === 'subs' && (
                        <>
                            {/* Track Selection */}
                            <Section title="Subtitle Track">
                                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-2">
                                    <TrackItem
                                        label="Off"
                                        selected={!subTracks.some(t => t.selected)}
                                        onClick={() => handleSubTrack("no")}
                                    />
                                    {subTracks.map(t => (
                                        <TrackItem
                                            key={t.id}
                                            label={`${t.title || `Track ${t.id}`} (${t.lang || 'unk'})`}
                                            selected={t.selected}
                                            onClick={() => handleSubTrack(t.id)}
                                        />
                                    ))}
                                    {subTracks.length === 0 && <div className="text-white/30 text-sm italic p-2">No subtitles found</div>}
                                </div>
                            </Section>

                            {/* Delay */}
                            <Section title={`Sync Delay (${subDelay > 0 ? '+' : ''}${subDelay.toFixed(1)}s)`}>
                                <Slider
                                    min={-5} max={5} step={0.1} value={subDelay}
                                    onChange={updateSubDelay}
                                />
                                <div className="flex justify-between text-xs text-white/40 mt-1">
                                    <span>Earlier (-5s)</span>
                                    <span>Reset</span>
                                    <span>Later (+5s)</span>
                                </div>
                            </Section>

                            {/* Scale */}
                            <Section title={`Size (${(subScale * 100).toFixed(0)}%)`}>
                                <Slider
                                    min={0.5} max={2.0} step={0.1} value={subScale}
                                    onChange={updateSubScale}
                                />
                            </Section>
                        </>
                    )}

                    {/* VIDEO & AUDIO TAB */}
                    {activeTab === 'video' && (
                        <>
                            {/* Audio Track */}
                            <Section title="Audio Track">
                                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-2">
                                    {audioTracks.map(t => (
                                        <TrackItem
                                            key={t.id}
                                            label={`${t.title || `Track ${t.id}`} (${t.lang || 'unk'})`}
                                            selected={t.selected}
                                            onClick={() => handleAudioTrack(t.id)}
                                        />
                                    ))}
                                </div>
                            </Section>

                            {/* Aspect Ratio */}
                            <Section title="Aspect Ratio">
                                <div className="grid grid-cols-3 gap-2">
                                    <SelectionBox label="Auto" selected={aspectRatio === "-1"} onClick={() => updateAspectRatio("-1")} />
                                    <SelectionBox label="16:9" selected={aspectRatio === "16:9"} onClick={() => updateAspectRatio("16:9")} />
                                    <SelectionBox label="4:3" selected={aspectRatio === "4:3"} onClick={() => updateAspectRatio("4:3")} />
                                    <SelectionBox label="21:9" selected={aspectRatio === "2.35:1"} onClick={() => updateAspectRatio("2.35:1")} />
                                </div>
                            </Section>

                            {/* Playback Speed */}
                            <Section title={`Playback Speed (${speed}x)`}>
                                <Slider
                                    min={0.25} max={5.0} step={0.25} value={speed}
                                    onChange={updateSpeed}
                                />
                            </Section>

                            {/* HW Dec */}
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-medium text-slate-300">Hardware Acceleration</span>
                                <button
                                    onClick={toggleHwDec}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${hwDec ? 'bg-violet-600' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hwDec ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </>
                    )}

                    {/* UI TAB */}
                    {activeTab === 'ui' && (
                        <>
                            {/* Auto Hide */}
                            <Section title={`Auto-Hide Controls (${autoHideDuration / 1000}s)`}>
                                <Slider
                                    min={0} max={5000} step={500} value={autoHideDuration}
                                    onChange={(val: number) => setAutoHideDuration(val)}
                                />
                                <div className="text-xs text-white/40 mt-1">Set to 0 to disable auto-hide.</div>
                            </Section>

                            {/* Loop Mode */}
                            <Section title="Loop Mode">
                                <div className="grid grid-cols-3 gap-2">
                                    <SelectionBox label="Off" selected={loopMode === "off"} onClick={() => updateLoop("off")} />
                                    <SelectionBox label="Loop One" selected={loopMode === "one"} onClick={() => updateLoop("one")} />
                                    <SelectionBox label="Loop All" selected={loopMode === "all"} onClick={() => updateLoop("all")} />
                                </div>
                            </Section>

                            {/* Dim Background Placeholder */}
                            <Section title="Cinema Mode (Dim)">
                                <div className="p-3 bg-white/5 rounded-lg text-sm text-white/50 text-center">
                                    (Coming Soon: Overlay Opacity)
                                    <br />
                                    Current: Adaptive Transparent
                                </div>
                            </Section>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}

// Sub-components for cleaner code
function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${active ? 'text-violet-400 border-violet-500' : 'text-white/50 border-transparent hover:text-white hover:bg-white/5'}`}
        >
            {icon}
            {label}
        </button>
    )
}

function Section({ title, children }: any) {
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">{title}</h3>
            {children}
        </div>
    )
}

function TrackItem({ label, selected, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-between w-full p-3 rounded-lg text-sm transition-colors ${selected ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/50' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
        >
            <span className="truncate">{label}</span>
            {selected && <Check size={16} />}
        </button>
    )
}

function SelectionBox({ label, selected, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`p-3 rounded-lg text-sm font-medium transition-colors text-center ${selected ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
        >
            {label}
        </button>
    )
}

function Slider({ min, max, step, value, onChange }: any) {
    return (
        <input
            type="range"
            min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-violet-500
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
        />
    )
}
