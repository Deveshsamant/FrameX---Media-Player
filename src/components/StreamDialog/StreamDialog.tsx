import { useState, useEffect } from 'react';
import { Globe, X, Clock, Wifi, Play, Trash2 } from 'lucide-react';

interface StreamDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onPlay: (url: string) => void;
}

const PROTOCOLS = ['http://', 'https://', 'rtsp://', 'rtmp://'];

export default function StreamDialog({ isOpen, onClose, onPlay }: StreamDialogProps) {
    const [url, setUrl] = useState('');
    const [recentUrls, setRecentUrls] = useState<string[]>([]);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Focus logic or reset could go here
        }
    }, [isOpen]);

    useEffect(() => {
        const saved = localStorage.getItem('framex-recent-urls');
        if (saved) {
            try {
                setRecentUrls(JSON.parse(saved));
            } catch { /* ignore */ }
        }
    }, []);

    useEffect(() => {
        const valid = PROTOCOLS.some(p => url.toLowerCase().startsWith(p)) || url.includes('.m3u8') || url.includes('.m3u');
        setIsValid(valid && url.length > 10);
    }, [url]);

    if (!isOpen) return null;

    const handlePlay = () => {
        if (!isValid) return;
        // Save to recent
        const updated = [url, ...recentUrls.filter(u => u !== url)].slice(0, 10);
        setRecentUrls(updated);
        localStorage.setItem('framex-recent-urls', JSON.stringify(updated));
        onPlay(url);
        onClose();
    };

    const removeRecent = (urlToRemove: string) => {
        const updated = recentUrls.filter(u => u !== urlToRemove);
        setRecentUrls(updated);
        localStorage.setItem('framex-recent-urls', JSON.stringify(updated));
    };

    const detectProtocol = () => {
        if (url.includes('.m3u8')) return 'HLS Stream';
        if (url.includes('.m3u')) return 'Playlist';
        if (url.startsWith('rtsp://')) return 'RTSP Stream';
        if (url.startsWith('rtmp://')) return 'RTMP Stream';
        if (url.startsWith('http')) return 'HTTP Stream';
        return 'Unknown';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="w-full max-w-lg mx-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                            <Globe size={22} className="text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Open Stream</h2>
                            <p className="text-xs text-slate-500">Play media from a URL</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* URL Input */}
                <div className="p-6 space-y-4">
                    <div className="relative">
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
                            placeholder="Enter stream URL (http://, rtsp://, .m3u8...)"
                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono text-sm"
                            autoFocus
                        />
                        {url && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[10px] rounded-full border ${isValid
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-300 border-red-500/30'
                                    }`}>
                                    {detectProtocol()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Supported Protocols */}
                    <div className="flex flex-wrap gap-2">
                        {['HTTP/HTTPS', 'HLS (.m3u8)', 'RTSP', 'RTMP'].map(proto => (
                            <span key={proto} className="px-2.5 py-1 text-[10px] bg-white/5 text-slate-500 rounded-md border border-white/5 font-medium">
                                <Wifi size={10} className="inline mr-1" />{proto}
                            </span>
                        ))}
                    </div>

                    {/* Play Button */}
                    <button
                        onClick={handlePlay}
                        disabled={!isValid}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:shadow-none"
                    >
                        <Play size={18} fill="currentColor" /> Play Stream
                    </button>

                    {/* Recent URLs */}
                    {recentUrls.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-white/5">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock size={12} /> Recent Streams
                            </h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {recentUrls.map((recentUrl, i) => (
                                    <div key={i} className="flex items-center gap-2 group">
                                        <button
                                            onClick={() => { setUrl(recentUrl); }}
                                            className="flex-1 text-left px-3 py-2 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors font-mono truncate"
                                        >
                                            {recentUrl}
                                        </button>
                                        <button
                                            onClick={() => removeRecent(recentUrl)}
                                            className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
