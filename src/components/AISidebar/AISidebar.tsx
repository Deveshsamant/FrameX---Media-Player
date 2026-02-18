import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
    Brain, Captions, Sliders, Info, ChevronDown, ChevronUp, Loader2,
    FileAudio, Settings2, Wand2
} from 'lucide-react';
import VideoAdjustments from '../VideoAdjustments/VideoAdjustments';
import Equalizer from '../Equalizer/Equalizer';
import SubtitleDownloader from '../SubtitleDownloader/SubtitleDownloader';

interface AISidebarProps {
    videoPath: string | null;
}

type TabId = 'subtitles' | 'tools' | 'info';

interface TabConfig {
    id: TabId;
    label: string;
    icon: typeof Captions;
    color: string;
}

const TABS: TabConfig[] = [
    { id: 'subtitles', label: 'Subtitles', icon: Captions, color: '#60a5fa' },
    { id: 'tools', label: 'Tools', icon: Sliders, color: '#a78bfa' },
    { id: 'info', label: 'Info', icon: Info, color: '#34d399' },
];

const WHISPER_MODELS = ['tiny', 'base', 'small', 'medium'];
const WHISPER_LANGUAGES = [
    { code: 'auto', label: 'Auto-detect' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' },
    { code: 'zh', label: 'Chinese' },
    { code: 'hi', label: 'Hindi' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'ru', label: 'Russian' },
    { code: 'ar', label: 'Arabic' },
];

export const AISidebar: React.FC<AISidebarProps> = ({ videoPath }) => {
    const [activeTab, setActiveTab] = useState<TabId>('subtitles');

    // Whisper state
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const [subtitlesPath, setSubtitlesPath] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [whisperModel, setWhisperModel] = useState('base');
    const [whisperLanguage, setWhisperLanguage] = useState('auto');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Info state
    const [videoInfo, setVideoInfo] = useState<Record<string, string>>({});

    React.useEffect(() => {
        const unlisten = listen('whisper-progress', (event: any) => {
            setProgress(event.payload as string);
        });
        return () => { unlisten.then(fn => fn()); };
    }, []);

    React.useEffect(() => {
        if (videoPath) {
            // Extract basic file info
            const fileName = videoPath.split(/[\\/]/).pop() || '';
            const ext = fileName.split('.').pop()?.toUpperCase() || '';
            setVideoInfo({
                'File Name': fileName,
                'Format': ext,
                'Path': videoPath,
            });
        }
    }, [videoPath]);

    const handleGenerate = async () => {
        if (!videoPath) return;
        setLoading(true);
        setError('');
        setProgress('Starting Whisper...');
        setSubtitlesPath('');

        try {
            const result = await invoke<string>('run_whisper', {
                videoPath,
                model: whisperModel,
            });
            setSubtitlesPath(result);
            setProgress('');
        } catch (e) {
            setError(String(e));
            setProgress('');
        } finally {
            setLoading(false);
        }
    };

    const renderSubtitlesTab = () => (
        <div className="space-y-4">
            {/* AI Whisper Generation */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                        <Wand2 size={14} className="text-blue-400" />
                    </div>
                    <span className="text-xs font-semibold text-white">AI Generate (Whisper)</span>
                </div>

                {/* Model & Language Selectors */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                >
                    <span className="flex items-center gap-1.5">
                        <Settings2 size={12} /> Model: {whisperModel} • Lang: {whisperLanguage === 'auto' ? 'Auto' : whisperLanguage}
                    </span>
                    {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showAdvanced && (
                    <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/5">
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Model</label>
                            <div className="grid grid-cols-4 gap-1">
                                {WHISPER_MODELS.map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setWhisperModel(m)}
                                        className={`px-2 py-1.5 text-[10px] rounded-md transition-all font-medium ${whisperModel === m
                                            ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40'
                                            : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                                            }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Language</label>
                            <select
                                value={whisperLanguage}
                                onChange={(e) => setWhisperLanguage(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs text-white outline-none cursor-pointer"
                            >
                                {WHISPER_LANGUAGES.map(l => (
                                    <option key={l.code} value={l.code} className="bg-slate-900">{l.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={loading || !videoPath}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-blue-500/10 disabled:shadow-none"
                >
                    {loading ? (
                        <><Loader2 size={14} className="animate-spin" /> Generating...</>
                    ) : (
                        <><FileAudio size={14} /> Generate Subtitles</>
                    )}
                </button>

                {progress && (
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-[10px] text-blue-300 font-mono">{progress}</p>
                    </div>
                )}

                {subtitlesPath && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <p className="text-[10px] text-emerald-300">✓ Saved: {subtitlesPath.split(/[\\/]/).pop()}</p>
                    </div>
                )}

                {error && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-[10px] text-red-300">{error}</p>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[9px] text-slate-600 uppercase">or</span>
                <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Subtitle Downloader */}
            <SubtitleDownloader videoPath={videoPath} compact />
        </div>
    );

    const renderToolsTab = () => (
        <div className="space-y-5">
            {/* Video Adjustments */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-amber-500/20 rounded-lg">
                        <Sliders size={14} className="text-amber-400" />
                    </div>
                    <span className="text-xs font-semibold text-white">Video Adjustments</span>
                </div>
                <VideoAdjustments compact />
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5" />

            {/* Equalizer */}
            <Equalizer compact />
        </div>
    );

    const renderInfoTab = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <Info size={14} className="text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-white">File Information</span>
            </div>

            {videoPath ? (
                <div className="space-y-1.5">
                    {Object.entries(videoInfo).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2 px-3 py-2 bg-white/5 rounded-lg">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold w-16 shrink-0 pt-0.5">{key}</span>
                            <span className="text-xs text-slate-300 break-all">{value}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <Info size={24} className="mx-auto mb-2 text-slate-700" />
                    <p className="text-xs text-slate-600">No video loaded</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-gradient-to-br from-violet-500/30 to-blue-500/30 rounded-lg">
                        <Brain size={18} className="text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">AI Assistant</h3>
                        <p className="text-[10px] text-slate-500">Tools & Intelligence</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-0.5 bg-white/5 rounded-lg">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-[11px] font-medium transition-all ${isActive
                                    ? 'bg-white/10 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <Icon size={13} style={isActive ? { color: tab.color } : undefined} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {activeTab === 'subtitles' && renderSubtitlesTab()}
                {activeTab === 'tools' && renderToolsTab()}
                {activeTab === 'info' && renderInfoTab()}
            </div>
        </div>
    );
};
