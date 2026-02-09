import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { X, Volume2, Activity, Zap } from 'lucide-react';

interface AudioSettingsProps {
    onClose: () => void;
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({ onClose }) => {
    const [compressorEnabled, setCompressorEnabled] = useState(false);
    const [hwDecStatus, setHwDecStatus] = useState<{ hw: string, cur: string, api: string } | null>(null);

    // Simple 3-band EQ for now as a "demo" of the filter capability
    // In reality, we'd map these to specific frequency ranges using `equalizer` filter or `superequalizer`
    const [eqValues, setEqValues] = useState({
        bass: 0,
        mids: 0,
        treble: 0
    });

    useEffect(() => {
        // Get initial HW Dec status
        invoke('mpv_get_hwdec_status');

        const unlisten = listen('mpv-hwdec-stats', (event: any) => {
            const [hw, cur, api] = event.payload;
            setHwDecStatus({ hw, cur, api });
        });

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    const toggleCompressor = (enabled: boolean) => {
        setCompressorEnabled(enabled);
        invoke('mpv_set_compressor', { enable: enabled });
    };

    const updateEq = (type: 'bass' | 'mids' | 'treble', val: number) => {
        const newEq = { ...eqValues, [type]: val };
        setEqValues(newEq);

        // Construct af string. 
        // Using simple lavfi equalizer for demonstration:
        // f=frequency:width_type=o:width=2:g=gain
        // Bass ~100Hz, Mids ~1000Hz, Treble ~10000Hz

        // Note: MPV's "equalizer" filter is deprecated in some builds often, but lavfi "equalizer" acts as a biquad.
        // Let's try to string them together.

        const bassFilter = `equalizer=f=100:width_type=o:width=2:g=${newEq.bass}`;
        const midFilter = `equalizer=f=1000:width_type=o:width=2:g=${newEq.mids}`;
        const trebleFilter = `equalizer=f=10000:width_type=o:width=2:g=${newEq.treble}`;

        const afString = `lavfi=[${bassFilter},${midFilter},${trebleFilter}]`;

        invoke('mpv_set_audio_filter', { filter: afString });
    };

    const resetEq = () => {
        setEqValues({ bass: 0, mids: 0, treble: 0 });
        invoke('mpv_set_audio_filter', { filter: "" });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 w-[400px] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-purple-500" />
                        Audio & Performance
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Compressor Section */}
                    <div className="bg-white/5 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <label className="flex items-center gap-2 font-medium">
                                <Activity className="w-4 h-4 text-green-400" />
                                Dynamic Compressor
                            </label>
                            <input
                                type="checkbox"
                                checked={compressorEnabled}
                                onChange={(e) => toggleCompressor(e.target.checked)}
                                className="toggle checkbox checkbox-primary checkbox-sm"
                            />
                        </div>
                        <p className="text-xs text-white/50">Normalizes volume to make quiet sounds audible and loud sounds comfortable.</p>
                    </div>

                    {/* Equalizer Section */}
                    <div className="bg-white/5 p-4 rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium flex items-center gap-2">Equalizer</h3>
                            <button onClick={resetEq} className="text-xs text-purple-400 hover:text-purple-300">Reset</button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="w-12 text-xs font-mono">BASS</span>
                                <input
                                    type="range" min="-10" max="10"
                                    value={eqValues.bass}
                                    onChange={(e) => updateEq('bass', Number(e.target.value))}
                                    className="flex-1 accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="w-8 text-xs text-right">{eqValues.bass}dB</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-12 text-xs font-mono">MID</span>
                                <input
                                    type="range" min="-10" max="10"
                                    value={eqValues.mids}
                                    onChange={(e) => updateEq('mids', Number(e.target.value))}
                                    className="flex-1 accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="w-8 text-xs text-right">{eqValues.mids}dB</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-12 text-xs font-mono">HIGH</span>
                                <input
                                    type="range" min="-10" max="10"
                                    value={eqValues.treble}
                                    onChange={(e) => updateEq('treble', Number(e.target.value))}
                                    className="flex-1 accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="w-8 text-xs text-right">{eqValues.treble}dB</span>
                            </div>
                        </div>
                    </div>

                    {/* Hardware Dec Section */}
                    <div className="bg-white/5 p-4 rounded-lg">
                        <div className="flex items-center gap-2 font-medium mb-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            Hardware Acceleration
                        </div>
                        {hwDecStatus ? (
                            <div className="text-xs space-y-1 font-mono text-white/70">
                                <div className="flex justify-between">
                                    <span>Requested:</span>
                                    <span className="text-white">{hwDecStatus.hw}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Current:</span>
                                    <span className={hwDecStatus.cur !== 'no' ? "text-green-400" : "text-red-400"}>
                                        {hwDecStatus.cur}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>API:</span>
                                    <span className="text-blue-400">{hwDecStatus.api}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-white/30 italic">Querying GPU status...</div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
