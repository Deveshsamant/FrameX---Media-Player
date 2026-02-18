import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Download, Languages, X, Loader2, Captions } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import type { SubtitleResult } from '../../types/playlist';

interface SubtitleDownloaderProps {
    videoPath?: string | null;
    onSubtitleLoaded?: (path: string) => void;
    compact?: boolean;
}

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'it', label: 'Italian' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ar', label: 'Arabic' },
    { code: 'hi', label: 'Hindi' },
    { code: 'ru', label: 'Russian' },
];

export default function SubtitleDownloader({ videoPath, onSubtitleLoaded, compact = false }: SubtitleDownloaderProps) {
    const { settings } = useSettings();
    const [query, setQuery] = useState('');
    const [language, setLanguage] = useState(settings.defaultSubtitleLanguage || 'en');
    const [results, setResults] = useState<SubtitleResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSearch = async () => {
        if (!query.trim()) return;
        if (!settings.openSubtitlesApiKey) {
            setError('Please set your OpenSubtitles API key in Settings → Integrations');
            return;
        }

        setLoading(true);
        setError('');
        setResults([]);

        try {
            const data = await invoke<SubtitleResult[]>('search_subtitles', {
                query: query.trim(),
                language,
                apiKey: settings.openSubtitlesApiKey,
            });
            setResults(data);
            if (data.length === 0) setError('No subtitles found. Try a different search term.');
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (result: SubtitleResult) => {
        if (!settings.openSubtitlesApiKey) {
            setError('API key required');
            return;
        }

        const saveDir = videoPath ? videoPath.substring(0, videoPath.lastIndexOf('\\')) : '.';
        setDownloading(result.id);
        setError('');
        setSuccess('');

        try {
            const savedPath = await invoke<string>('download_subtitle', {
                fileId: result.file_id,
                saveDir,
                fileName: result.file_name,
                apiKey: settings.openSubtitlesApiKey,
            });
            setSuccess(`Downloaded: ${result.file_name}`);
            onSubtitleLoaded?.(savedPath);
        } catch (e) {
            setError(`Download failed: ${String(e)}`);
        } finally {
            setDownloading(null);
        }
    };

    if (compact) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Captions size={14} className="text-blue-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-medium">Download Subtitles</span>
                </div>
                <div className="flex gap-1.5">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Movie name..."
                        className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500/50"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    </button>
                </div>
                {results.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {results.slice(0, 5).map(r => (
                            <button
                                key={r.id}
                                onClick={() => handleDownload(r)}
                                disabled={downloading === r.id}
                                className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                            >
                                <span className="truncate flex-1">{r.file_name}</span>
                                {downloading === r.id ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                            </button>
                        ))}
                    </div>
                )}
                {error && <p className="text-[10px] text-red-400">{error}</p>}
                {success && <p className="text-[10px] text-emerald-400">{success}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Captions size={20} className="text-blue-400" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-white">Subtitle Downloader</h4>
                    <p className="text-xs text-slate-500">Search & download from OpenSubtitles</p>
                </div>
            </div>

            {!settings.openSubtitlesApiKey && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-300">
                        ⚠️ Set your OpenSubtitles API key in Settings → Integrations to use this feature.
                    </p>
                </div>
            )}

            <div className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by movie or show name..."
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none cursor-pointer"
                >
                    {LANGUAGES.map(l => (
                        <option key={l.code} value={l.code} className="bg-slate-900">{l.label}</option>
                    ))}
                </select>
                <button
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl transition-colors flex items-center gap-2 font-medium"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Search
                </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {results.map(r => (
                        <div
                            key={r.id}
                            className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors group"
                        >
                            <div className="flex-1 min-w-0 mr-3">
                                <p className="text-sm text-white truncate font-medium">{r.file_name}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Languages size={10} /> {r.language.toUpperCase()}
                                    </span>
                                    <span>{r.download_count.toLocaleString()} downloads</span>
                                    {r.hearing_impaired && <span className="text-amber-400">HI</span>}
                                    {r.release && <span className="text-slate-600 truncate">{r.release}</span>}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDownload(r)}
                                disabled={downloading === r.id}
                                className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium shrink-0"
                            >
                                {downloading === r.id ? (
                                    <><Loader2 size={12} className="animate-spin" /> Downloading...</>
                                ) : (
                                    <><Download size={12} /> Download</>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                    <X size={14} className="text-red-400 shrink-0" />
                    <p className="text-xs text-red-300">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-xs text-emerald-300">✓ {success}</p>
                </div>
            )}
        </div>
    );
}
