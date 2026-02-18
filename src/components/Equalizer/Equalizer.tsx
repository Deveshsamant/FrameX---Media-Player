import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Music, RotateCcw } from 'lucide-react';

const BANDS = [
    { freq: '31', label: '31Hz' },
    { freq: '62', label: '62Hz' },
    { freq: '125', label: '125Hz' },
    { freq: '250', label: '250Hz' },
    { freq: '500', label: '500Hz' },
    { freq: '1k', label: '1kHz' },
    { freq: '2k', label: '2kHz' },
    { freq: '4k', label: '4kHz' },
    { freq: '8k', label: '8kHz' },
    { freq: '16k', label: '16kHz' },
];

const PRESETS: Record<string, number[]> = {
    'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'Bass Boost': [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
    'Treble Boost': [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
    'Vocal': [-2, -1, 0, 3, 6, 6, 3, 0, -1, -2],
    'Electronic': [6, 4, 0, -2, -1, 2, 0, 4, 6, 8],
    'Rock': [5, 3, -1, -3, -1, 2, 4, 5, 5, 4],
    'Bass & Treble': [6, 4, 0, -2, -3, -2, 0, 4, 6, 6],
    'Night Mode': [-4, -2, 0, 2, 3, 3, 2, 0, -2, -4],
};

interface EqualizerProps {
    compact?: boolean;
}

export default function Equalizer({ compact = false }: EqualizerProps) {
    const [gains, setGains] = useState<number[]>(new Array(10).fill(0));
    const [activePreset, setActivePreset] = useState<string>('Flat');
    const [enabled, setEnabled] = useState(false);

    const buildFilterString = (newGains: number[]) => {
        // Build lavfi equalizer filter chain for MPV
        // Using superequalizer which has 18 bands, we map to first 10
        // Or use explicit firequalizer
        const freqs = [31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        const eqParts = freqs.map((f, i) => {
            const g = newGains[i] || 0;
            return `equalizer=f=${f}:width_type=o:width=2:g=${g}`;
        });
        return `lavfi=[${eqParts.join(',')}]`;
    };

    const applyEQ = (newGains: number[]) => {
        setGains(newGains);
        if (enabled) {
            const filter = buildFilterString(newGains);
            invoke('mpv_set_audio_filter', { filter });
        }
    };

    const handleGainChange = (index: number, value: number) => {
        const newGains = [...gains];
        newGains[index] = value;
        applyEQ(newGains);
    };

    const handlePreset = (name: string) => {
        setActivePreset(name);
        applyEQ(PRESETS[name]);
    };

    const toggleEQ = () => {
        const newEnabled = !enabled;
        setEnabled(newEnabled);
        if (newEnabled) {
            const filter = buildFilterString(gains);
            invoke('mpv_set_audio_filter', { filter });
        } else {
            invoke('mpv_set_audio_filter', { filter: '' });
        }
    };

    const resetEQ = () => {
        setActivePreset('Flat');
        applyEQ(PRESETS['Flat']);
    };

    if (compact) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Music size={14} className="text-emerald-400" />
                        <span className="text-xs text-slate-300 font-medium">Equalizer</span>
                    </div>
                    <button
                        onClick={toggleEQ}
                        className={`w-8 h-4 rounded-full transition-colors relative ${enabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                    >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${enabled ? 'left-4.5' : 'left-0.5'}`}
                            style={{ left: enabled ? '17px' : '2px' }}
                        />
                    </button>
                </div>
                <div className="flex gap-1 items-end h-20 px-1">
                    {gains.map((g, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <input
                                type="range"
                                min={-12}
                                max={12}
                                value={g}
                                onChange={(e) => handleGainChange(i, Number(e.target.value))}
                                className="w-full appearance-none cursor-pointer h-16 accent-emerald-400"
                                style={{
                                    writingMode: 'vertical-lr' as any,
                                    direction: 'rtl',
                                    width: '12px',
                                }}
                            />
                            <span className="text-[8px] text-slate-600">{BANDS[i].freq}</span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1">
                    {Object.keys(PRESETS).slice(0, 4).map(name => (
                        <button
                            key={name}
                            onClick={() => handlePreset(name)}
                            className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${activePreset === name
                                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                                }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Music size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-white">Graphic Equalizer</h4>
                        <p className="text-xs text-slate-500">10-band audio control</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={resetEQ}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                    >
                        <RotateCcw size={12} /> Reset
                    </button>
                    <button
                        onClick={toggleEQ}
                        className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all`}
                            style={{ left: enabled ? '26px' : '4px' }}
                        />
                    </button>
                </div>
            </div>

            {/* EQ Bars */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex gap-2 items-end h-40">
                    {gains.map((g, i) => {
                        const percentage = ((g + 12) / 24) * 100;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <span className="text-[10px] font-mono text-slate-500 group-hover:text-emerald-400 transition-colors">
                                    {g > 0 ? '+' : ''}{g}dB
                                </span>
                                <div className="relative w-full h-32 flex items-center justify-center">
                                    <input
                                        type="range"
                                        min={-12}
                                        max={12}
                                        value={g}
                                        onChange={(e) => handleGainChange(i, Number(e.target.value))}
                                        className="absolute appearance-none cursor-pointer accent-emerald-400"
                                        style={{
                                            writingMode: 'vertical-lr' as any,
                                            direction: 'rtl',
                                            width: '24px',
                                            height: '128px',
                                        }}
                                    />
                                    {/* Visual bar behind the slider */}
                                    <div className="absolute bottom-0 w-3 rounded-full overflow-hidden pointer-events-none"
                                        style={{ height: '128px' }}>
                                        <div
                                            className="absolute bottom-0 w-full rounded-full transition-all duration-150"
                                            style={{
                                                height: `${percentage}%`,
                                                background: `linear-gradient(to top, #10b981, #34d399)`,
                                                opacity: enabled ? 0.4 : 0.15,
                                            }}
                                        />
                                    </div>
                                </div>
                                <span className="text-[10px] text-slate-500 group-hover:text-white transition-colors font-medium">
                                    {BANDS[i].label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Presets */}
            <div className="space-y-2">
                <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Presets</h5>
                <div className="grid grid-cols-4 gap-2">
                    {Object.keys(PRESETS).map(name => (
                        <button
                            key={name}
                            onClick={() => handlePreset(name)}
                            className={`px-3 py-2 text-xs rounded-lg transition-all font-medium ${activePreset === name
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
                                }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
