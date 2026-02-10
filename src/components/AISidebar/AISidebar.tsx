import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface AISidebarProps {
    videoPath: string | null;
}

export const AISidebar: React.FC<AISidebarProps> = ({ videoPath }) => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [subtitlesPath, setSubtitlesPath] = useState<string>('');
    const [error, setError] = useState<string>('');

    React.useEffect(() => {
        const unlisten = listen<{ status: string; progress: number }>(
            'whisper-progress',
            (event) => {
                setProgress(event.payload.status);
            }
        );

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    const handleGenerateSubtitles = async () => {
        if (!videoPath) {
            setError('No video loaded');
            return;
        }

        setLoading(true);
        setError('');
        setProgress('Starting Whisper...');

        try {
            const result = await invoke<string>('run_whisper', {
                videoPath,
                model: 'base',
                language: null, // Auto-detect
            });
            setSubtitlesPath(result);
            setProgress('Subtitles generated successfully!');
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed right-0 top-16 bottom-20 w-80 bg-black/90 backdrop-blur-sm border-l border-white/10 p-4 overflow-y-auto z-50 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <h2 className="text-xl font-bold text-white mb-4">AI Subtitles</h2>

            {/* Subtitle Generation */}
            <div className="mb-6">
                <p className="text-gray-400 text-sm mb-4">
                    Generate subtitles locally using OpenAI Whisper.
                </p>
                <button
                    onClick={handleGenerateSubtitles}
                    disabled={loading || !videoPath}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                    {loading ? 'Generating...' : 'Generate Subtitles (Whisper)'}
                </button>
                {progress && <p className="text-sm text-gray-400 mt-2">{progress}</p>}
                {subtitlesPath && (
                    <p className="text-xs text-green-400 mt-2">
                        ✓ Subtitles saved: {subtitlesPath.split('\\').pop()}
                    </p>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-sm text-red-300">{error}</p>
                </div>
            )}
        </div>
    );
};
