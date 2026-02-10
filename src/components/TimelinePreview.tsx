import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface TimelinePreviewProps {
    path: string;
    time: number;
    visible: boolean;
    xPosition: number; // Pixel position for absolute positioning
}

export default function TimelinePreview({ path, time, visible, xPosition }: TimelinePreviewProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!visible || !path) return;

        // Debounce to prevent flooding backend
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }

        // Only fetch if time changed significantly (e.g. > 1 sec) or first load
        // Actually, for smooth scrubbing, we want it snappy. Backend handles rounding.
        // Let's debounce slightly (50ms)
        timeoutRef.current = window.setTimeout(async () => {
            try {
                const url = await invoke<string>('generate_seek_preview', { videoPath: path, time });
                setImageUrl(url);
            } catch (e) {
                console.error("Failed to generate preview:", e);
            }
        }, 50);

        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        }
    }, [path, time, visible]);

    if (!visible) return null;

    return (
        <div
            className="absolute bottom-6 mb-2 flex flex-col items-center pointer-events-none z-50 transform -translate-x-1/2 transition-all duration-75 ease-out"
            style={{ left: xPosition }}
        >
            <div className="bg-slate-900 border-2 border-white/20 rounded-lg overflow-hidden shadow-2xl relative">
                {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="w-40 h-auto object-cover aspect-video" />
                ) : (
                    <div className="w-40 aspect-video bg-slate-800 animate-pulse flex items-center justify-center">
                        <span className="text-xs text-white/20">Loading...</span>
                    </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] font-mono py-0.5 text-center backdrop-blur-sm">
                    {formatTime(time)}
                </div>
            </div>
            {/* Arrow down */}
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/20 mt-[-1px]" />
        </div>
    );
}

function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
