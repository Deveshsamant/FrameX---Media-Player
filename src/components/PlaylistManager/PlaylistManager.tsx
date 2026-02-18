import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ListMusic, Plus, Trash2, Play, Edit3, Save, X, GripVertical, FolderOpen } from 'lucide-react';
import type { Playlist } from '../../types/playlist';

interface PlaylistManagerProps {
    onPlayFile: (path: string) => void;
    libraryFiles?: string[];
    isOpen: boolean;
    onClose: () => void;
}

export default function PlaylistManager({ onPlayFile, libraryFiles = [], isOpen, onClose }: PlaylistManagerProps) {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [editingName, setEditingName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadPlaylists();
    }, []);

    const loadPlaylists = async () => {
        try {
            const data = await invoke<Playlist[]>('get_playlists');
            setPlaylists(data);
        } catch { /* ignore */ }
    };

    const createPlaylist = async () => {
        if (!newName.trim()) return;
        try {
            const pl = await invoke<Playlist>('save_playlist', {
                name: newName.trim(),
                items: [],
                id: null,
            });
            setPlaylists(prev => [...prev, pl]);
            setNewName('');
            setIsCreating(false);
            setSelectedPlaylist(pl);
        } catch { /* ignore */ }
    };

    const deletePlaylist = async (id: string) => {
        try {
            await invoke('delete_playlist', { id });
            setPlaylists(prev => prev.filter(p => p.id !== id));
            if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
        } catch { /* ignore */ }
    };

    const renamePlaylist = async () => {
        if (!selectedPlaylist || !editingName.trim()) return;
        try {
            const updated = await invoke<Playlist>('save_playlist', {
                name: editingName.trim(),
                items: selectedPlaylist.items,
                id: selectedPlaylist.id,
            });
            setPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedPlaylist(updated);
            setEditingName('');
        } catch { /* ignore */ }
    };

    const addToPlaylist = async (filePath: string) => {
        if (!selectedPlaylist) return;
        const newItems = [...selectedPlaylist.items, filePath];
        try {
            const updated = await invoke<Playlist>('save_playlist', {
                name: selectedPlaylist.name,
                items: newItems,
                id: selectedPlaylist.id,
            });
            setPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedPlaylist(updated);
        } catch { /* ignore */ }
    };

    const removeFromPlaylist = async (index: number) => {
        if (!selectedPlaylist) return;
        const newItems = selectedPlaylist.items.filter((_, i) => i !== index);
        try {
            const updated = await invoke<Playlist>('save_playlist', {
                name: selectedPlaylist.name,
                items: newItems,
                id: selectedPlaylist.id,
            });
            setPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedPlaylist(updated);
        } catch { /* ignore */ }
    };

    const playPlaylist = (startIndex: number = 0) => {
        if (!selectedPlaylist || selectedPlaylist.items.length === 0) return;
        onPlayFile(selectedPlaylist.items[startIndex]);
    };

    const getFileName = (path: string) => {
        return path.split(/[\\/]/).pop() || path;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="w-full max-w-2xl mx-4 max-h-[80vh] bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/20 rounded-lg">
                            <ListMusic size={22} className="text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Playlists</h2>
                            <p className="text-xs text-slate-500">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar: Playlist List */}
                    <div className="w-56 border-r border-white/10 flex flex-col shrink-0">
                        <div className="p-3 border-b border-white/5">
                            {isCreating ? (
                                <div className="flex gap-1.5">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
                                        placeholder="Playlist name..."
                                        className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-violet-500/50"
                                        autoFocus
                                    />
                                    <button onClick={createPlaylist} className="p-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors">
                                        <Save size={12} />
                                    </button>
                                    <button onClick={() => setIsCreating(false)} className="p-1.5 text-slate-400 hover:text-white transition-colors">
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg border border-violet-500/20 transition-colors font-medium"
                                >
                                    <Plus size={14} /> New Playlist
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {playlists.map(pl => (
                                <button
                                    key={pl.id}
                                    onClick={() => setSelectedPlaylist(pl)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${selectedPlaylist?.id === pl.id
                                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <ListMusic size={14} />
                                        <span className="truncate">{pl.name}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-600">{pl.items.length}</span>
                                </button>
                            ))}
                            {playlists.length === 0 && (
                                <p className="text-xs text-slate-600 text-center py-8">No playlists yet</p>
                            )}
                        </div>
                    </div>

                    {/* Main: Playlist Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {selectedPlaylist ? (
                            <>
                                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        {editingName ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && renamePlaylist()}
                                                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={renamePlaylist} className="text-emerald-400 hover:text-emerald-300"><Save size={14} /></button>
                                                <button onClick={() => setEditingName('')} className="text-slate-400 hover:text-white"><X size={14} /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-lg font-bold text-white">{selectedPlaylist.name}</h3>
                                                <button onClick={() => setEditingName(selectedPlaylist.name)} className="text-slate-500 hover:text-white transition-colors">
                                                    <Edit3 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedPlaylist.items.length > 0 && (
                                            <button
                                                onClick={() => playPlaylist(0)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-medium transition-colors"
                                            >
                                                <Play size={12} fill="currentColor" /> Play All
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deletePlaylist(selectedPlaylist.id)}
                                            className="p-1.5 text-red-400/50 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                                    {selectedPlaylist.items.map((item, i) => (
                                        <div
                                            key={`${item}-${i}`}
                                            className="flex items-center gap-3 px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                                        >
                                            <GripVertical size={14} className="text-slate-600 cursor-grab" />
                                            <span className="text-xs text-slate-500 font-mono w-5">{i + 1}</span>
                                            <button
                                                onClick={() => onPlayFile(item)}
                                                className="flex-1 text-left text-sm text-slate-300 hover:text-white truncate transition-colors"
                                            >
                                                {getFileName(item)}
                                            </button>
                                            <button
                                                onClick={() => removeFromPlaylist(i)}
                                                className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}

                                    {selectedPlaylist.items.length === 0 && (
                                        <div className="text-center py-10 text-slate-600">
                                            <ListMusic size={32} className="mx-auto mb-3 opacity-30" />
                                            <p className="text-xs">This playlist is empty</p>
                                            <p className="text-[10px] mt-1">Add files from your library below</p>
                                        </div>
                                    )}
                                </div>

                                {/* Add from library */}
                                {libraryFiles.length > 0 && (
                                    <div className="border-t border-white/5 p-4 shrink-0">
                                        <h5 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <FolderOpen size={10} /> Library Files
                                        </h5>
                                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                                            {libraryFiles.slice(0, 20).map((file, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => addToPlaylist(file)}
                                                    className="px-2.5 py-1 text-[10px] bg-white/5 text-slate-400 hover:text-white hover:bg-violet-500/20 rounded-md transition-colors border border-transparent hover:border-violet-500/30"
                                                >
                                                    <Plus size={8} className="inline mr-0.5" />
                                                    {getFileName(file)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center text-slate-600">
                                    <ListMusic size={40} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Select a playlist</p>
                                    <p className="text-xs mt-1">or create a new one</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
