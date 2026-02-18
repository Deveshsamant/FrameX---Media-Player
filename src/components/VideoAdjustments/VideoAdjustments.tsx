import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sun, Contrast, Droplets, Sparkles, RotateCcw } from 'lucide-react';

interface VideoAdjustmentsProps {
    compact?: boolean;
}

interface Adjustment {
    key: string;
    label: string;
    icon: typeof Sun;
    value: number;
    command: string;
    color: string;
}

export default function VideoAdjustments({ compact = false }: VideoAdjustmentsProps) {
    const [brightness, setBrightness] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [gamma, setGamma] = useState(0);

    const adjustments: Adjustment[] = [
        { key: 'brightness', label: 'Brightness', icon: Sun, value: brightness, command: 'mpv_set_brightness', color: '#fbbf24' },
        { key: 'contrast', label: 'Contrast', icon: Contrast, value: contrast, command: 'mpv_set_contrast', color: '#60a5fa' },
        { key: 'saturation', label: 'Saturation', icon: Droplets, value: saturation, command: 'mpv_set_saturation', color: '#f472b6' },
        { key: 'gamma', label: 'Gamma', icon: Sparkles, value: gamma, command: 'mpv_set_gamma', color: '#a78bfa' },
    ];

    const setters: Record<string, (v: number) => void> = {
        brightness: setBrightness,
        contrast: setContrast,
        saturation: setSaturation,
        gamma: setGamma,
    };

    const handleChange = (key: string, value: number, command: string) => {
        setters[key](value);
        invoke(command, { value });
    };

    const resetAll = () => {
        setBrightness(0);
        setContrast(0);
        setSaturation(0);
        setGamma(0);
        invoke('mpv_set_brightness', { value: 0 });
        invoke('mpv_set_contrast', { value: 0 });
        invoke('mpv_set_saturation', { value: 0 });
        invoke('mpv_set_gamma', { value: 0 });
    };

    if (compact) {
        return (
            <div className="space-y-3">
                {adjustments.map(adj => (
                    <div key={adj.key} className="flex items-center gap-3">
                        <adj.icon size={14} style={{ color: adj.color }} className="shrink-0" />
                        <span className="text-xs text-slate-400 w-16 shrink-0">{adj.label}</span>
                        <input
                            type="range"
                            min={-100}
                            max={100}
                            value={adj.value}
                            onChange={(e) => handleChange(adj.key, Number(e.target.value), adj.command)}
                            className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                        />
                        <span className="text-xs text-slate-500 w-8 text-right font-mono">{adj.value}</span>
                    </div>
                ))}
                <button
                    onClick={resetAll}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors mt-1"
                >
                    <RotateCcw size={12} /> Reset
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Video Adjustments</h4>
                <button
                    onClick={resetAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                >
                    <RotateCcw size={12} /> Reset All
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adjustments.map(adj => {
                    const Icon = adj.icon;
                    return (
                        <div key={adj.key} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${adj.color}20` }}>
                                        <Icon size={16} style={{ color: adj.color }} />
                                    </div>
                                    <span className="text-sm font-medium text-white">{adj.label}</span>
                                </div>
                                <span className="text-sm font-mono px-2 py-0.5 rounded-md bg-white/5" style={{ color: adj.color }}>
                                    {adj.value > 0 ? '+' : ''}{adj.value}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={-100}
                                max={100}
                                value={adj.value}
                                onChange={(e) => handleChange(adj.key, Number(e.target.value), adj.command)}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg
                                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                                style={{
                                    background: `linear-gradient(to right, ${adj.color}40 0%, ${adj.color} ${(adj.value + 100) / 2}%, rgba(255,255,255,0.1) ${(adj.value + 100) / 2}%, rgba(255,255,255,0.1) 100%)`
                                }}
                            />
                            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                                <span>-100</span>
                                <span>0</span>
                                <span>+100</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
