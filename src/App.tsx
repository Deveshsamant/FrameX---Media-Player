import { useState, useRef, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Window } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import {
  Play, Pause, Settings, FolderOpen, Volume2, SkipBack, SkipForward,
  Maximize2, Minimize2, Film, Sparkles, MonitorPlay, Library, Grid, List,
  X, Minus, Square, Copy, ArrowLeft, Captions, Check, ArrowUpDown, Clock,
  FileText, Calendar as CalendarIcon
} from "lucide-react";
import { useFile } from "./context/FileContext";
import { useGestures } from "./hooks/useGestures";
import SettingsModal from "./components/SettingsModal/SettingsModal";
import HomeScreen from "./pages/HomeScreen";
import EnhancedSettingsModal from "./components/EnhancedSettingsModal/EnhancedSettingsModal";
import TimelinePreview from "./components/TimelinePreview";
import { useTheme } from "./context/ThemeContext";
import { useSettings } from "./context/SettingsContext";

interface Track {
  id: number;
  type: string;
  title?: string;
  lang?: string;
  selected: boolean;
}

interface VideoEntry {
  path: string;
  name: string;
  size: number;
  modified: number;
  created: number;
}

type SortOption = 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc' | 'duration-asc' | 'duration-desc' | 'date-asc' | 'date-desc';

function App() {
  const { currentFile, setFile } = useFile();
  const { settings } = useSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(100); // 0-300%
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Timeline Preview State
  const [previewTime, setPreviewTime] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewX, setPreviewX] = useState(0);

  // Player Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [autoHideDuration, setAutoHideDuration] = useState(1000); // Default 1s
  const [loopMode, setLoopMode] = useState("off");

  // App Settings State
  const [showAppSettings, setShowAppSettings] = useState(false);

  // Playback Speed State
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Subtitle State
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showSubsMenu, setShowSubsMenu] = useState(false);

  // Library State
  const [library, setLibrary] = useState<VideoEntry[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [durationCache, setDurationCache] = useState<Record<string, number>>({});
  const [durationQueue, setDurationQueue] = useState<string[]>([]);
  const [processingDuration, setProcessingDuration] = useState(false);

  // Window State
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const updateMaximizedState = async () => {
      const win = Window.getCurrent();
      setIsMaximized(await win.isMaximized());
      setIsFullscreen(await win.isFullscreen());
    };
    updateMaximizedState();
    window.addEventListener('resize', updateMaximizedState);
    return () => window.removeEventListener('resize', updateMaximizedState);
  }, []);

  // MPV Progress Listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    async function setupListener() {
      unlisten = await listen<[number, number]>('mpv-progress', (event) => {
        const [pos, dur] = event.payload;
        if (!isDragging) {
          setCurrentTime(pos);
          setDuration(dur);
        }
      });
    }
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, [isDragging]);

  const minimizeWindow = () => Window.getCurrent().minimize();
  const maximizeWindow = async () => {
    const win = Window.getCurrent();
    if (await win.isMaximized()) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  };
  const closeWindow = () => Window.getCurrent().close();

  const toggleFullscreen = async () => {
    const win = Window.getCurrent();
    const newState = !isFullscreen;

    // Fix: Unmaximize first if going fullscreen to prevent state conflicts
    if (newState && isMaximized) {
      await win.unmaximize();
    }

    await win.setFullscreen(newState);
    setIsFullscreen(newState);
  };

  // Auto-hide controls logic
  useEffect(() => {
    if (!isPlayerActive) {
      setShowControls(true);
      return;
    }

    const resetTimer = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
      // If duration is 0, never hide
      if (autoHideDuration > 0) {
        controlsTimeoutRef.current = window.setTimeout(() => {
          setShowControls(false);
        }, autoHideDuration);
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('keydown', resetTimer);

    // Initial set
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlayerActive, autoHideDuration]);

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isPlayerActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for these keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", " "].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case "ArrowUp":
          invoke("mpv_add_volume", { delta: 5 });
          break;
        case "ArrowDown":
          invoke("mpv_add_volume", { delta: -5 });
          break;
        case "ArrowRight":
          invoke("mpv_seek_relative", { seconds: 5 });
          break;
        case "ArrowLeft":
          invoke("mpv_seek_relative", { seconds: -5 });
          break;
        case " ":
        case "Space":
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayerActive, togglePause]);

  // Sync Player State
  useEffect(() => {
    if (isPlayerActive) {
      const u1 = listen<Track[]>('mpv-tracks', (e) => setTracks(e.payload));
      const u2 = listen<number>('mpv-volume', (e) => setVolume(e.payload));
      const u3 = listen<boolean>('mpv-pause', (e) => setIsPlaying(!e.payload));

      // Initial Fetch
      invoke('mpv_get_tracks');
      // invoke('mpv_get_volume'); // If implemented?
      // For now, volume/pause updates will come from events if changed.
      // But we should fetch initial state? 
      // Since MPV starts fresh, defaults apply.

      return () => {
        u1.then(f => f());
        u2.then(f => f());
        u3.then(f => f());
      };
    }
  }, [isPlayerActive, currentFile]);

  async function handleBack() {
    setIsPlayerActive(false);
    setIsPlaying(false);
    // Exit fullscreen if active
    if (isFullscreen) {
      Window.getCurrent().setFullscreen(false);
      setIsFullscreen(false);
    }
    await invoke("stop_video");
  }



  async function handleOpenFile() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Video',
          extensions: ['mkv', 'mp4', 'avi', 'mov', 'webm', 'flv', 'wmv']
        }]
      });

      if (selected && typeof selected === 'string') {
        setFile(selected);
        // Clear library to focus on single file
        setLibrary([]);
      }
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }

  async function handleOpenFolder() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === 'string') {
        setIsLoading(true);
        // Invoke backend command to scan folder
        const videos = await invoke<VideoEntry[]>("list_videos", { folderPath: selected });
        setLibrary(videos);
        setFile(null); // Clear current file when opening folder

        // Queue duration fetching
        const paths = videos.map(v => v.path);
        setDurationQueue(paths);

        setIsLoading(false);
      }
    } catch (err) {
      console.error("Failed to open folder:", err);
      setIsLoading(false);
    }
  }

  // Duration Fetching Effect
  useEffect(() => {
    if (processingDuration || durationQueue.length === 0) return;

    const fetchNextDuration = async () => {
      setProcessingDuration(true);
      const nextPath = durationQueue[0];

      try {
        // Skip if already cached
        if (!durationCache[nextPath]) {
          const dur = await invoke<number>("get_video_duration", { videoPath: nextPath });
          setDurationCache(prev => ({ ...prev, [nextPath]: dur }));
        }
      } catch (e) {
        console.error("Duration fetch failed for", nextPath, e);
      } finally {
        setDurationQueue(prev => prev.slice(1));
        setProcessingDuration(false);
      }
    };

    fetchNextDuration();
  }, [durationQueue, processingDuration, durationCache]);

  const sortedLibrary = [...library].sort((a, b) => {
    switch (sortOption) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'size-asc': return a.size - b.size;
      case 'size-desc': return b.size - a.size;
      case 'duration-asc': return (durationCache[a.path] || 0) - (durationCache[b.path] || 0);
      case 'duration-desc': return (durationCache[b.path] || 0) - (durationCache[a.path] || 0);
      case 'date-asc': return a.created - b.created;
      case 'date-desc': return b.created - a.created;
      default: return 0;
    }
  });

  async function handlePlay(path?: string) {
    const target = path || currentFile;
    if (!target) return;

    // Update current file if playing from library
    if (path) setFile(path);

    setIsLoading(true);
    try {
      // Use new load_video command
      await invoke("load_video", { path: target });
      setIsPlaying(true);
      setIsPlayerActive(true);
    } catch (err) {
      console.error("Failed to play video:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Next/Previous Video Navigation
  function playPreviousVideo() {
    if (sortedLibrary.length === 0) return;
    const currentPath = currentFile || "";
    const currentIndex = sortedLibrary.findIndex(v => v.path === currentPath);
    if (currentIndex <= 0) return; // Already at first video
    const prevVideo = sortedLibrary[currentIndex - 1];
    handlePlay(prevVideo.path);
  }

  function playNextVideo() {
    if (sortedLibrary.length === 0) return;
    const currentPath = currentFile || "";
    const currentIndex = sortedLibrary.findIndex(v => v.path === currentPath);
    if (currentIndex === -1 || currentIndex >= sortedLibrary.length - 1) return; // Not found or already at last video
    const nextVideo = sortedLibrary[currentIndex + 1];
    handlePlay(nextVideo.path);
  }

  async function togglePause() {
    try {
      await invoke("toggle_pause");
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error("Failed to toggle pause:", err);
    }
  }

  async function handleSeek(seconds: number) {
    try {
      await invoke("seek", { amount: seconds });
    } catch (err) {
      console.error("Failed to seek:", err);
    }
  }

  async function handleVolume(newVolume: number) {
    const clampedVolume = Math.max(0, Math.min(300, newVolume));
    setVolume(clampedVolume);
    try {
      await invoke("set_volume", { volume: clampedVolume });
    } catch (err) {
      console.error("Failed to set volume:", err);
      console.error("Failed to set volume:", err);
    }
  }

  const handleVolumeChange = (delta: number) => {
    setVolume(prev => {
      const newVol = Math.max(0, Math.min(300, prev + delta));
      invoke("set_volume", { volume: newVol });
      return newVol;
    });
  };

  const gestureHandlers = useGestures({
    onVolumeChange: handleVolumeChange,
    onSeek: (delta) => handleSeek(delta),
    onTogglePause: togglePause,
    onToggleFullscreen: toggleFullscreen
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      } else if (e.code === 'ArrowRight') {
        handleSeek(5);
      } else if (e.code === 'ArrowLeft') {
        handleSeek(-5);
      } else if (e.code === 'Escape') {
        if (isFullscreen) {
          Window.getCurrent().setFullscreen(false);
          setIsFullscreen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen]);

  const fileName = currentFile ? currentFile.split(/[\\/]/).pop() : null;

  // Thumbnail Queue System
  const [thumbQueue, setThumbQueue] = useState<string[]>([]);
  const [processing, setProcessing] = useState<string[]>([]);
  const maxConcurrency = 8;

  // Parent-level thumbnail cache (persists across child re-renders)
  const [thumbnailCache, setThumbnailCache] = useState<Record<string, string>>({});
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({});

  // Process Queue Effect
  useEffect(() => {
    if (thumbQueue.length > 0 && processing.length < maxConcurrency) {
      const nextPath = thumbQueue[0];
      setThumbQueue(prev => prev.slice(1));
      setProcessing(prev => [...prev, nextPath]);
    }
  }, [thumbQueue, processing, maxConcurrency]);

  const addToQueue = (path: string) => {
    setThumbQueue(prev => {
      if (prev.includes(path) || processing.includes(path)) return prev;
      return [...prev, path];
    });
  };

  const removeFromProcessing = (path: string) => {
    setProcessing(prev => prev.filter(p => p !== path));
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    invoke("mpv_set_speed", { speed });
    setShowSpeedMenu(false);
  };

  const handleSubTrack = (id: number | string) => {
    invoke('mpv_set_subtitle', { sid: String(id) });
    // Optimistic update
    setTracks(prev => prev.map(t =>
      t.type === 'sub' ? { ...t, selected: String(t.id) === String(id) } : t
    ));
    setShowSubsMenu(false);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!settings.enableTimelinePreview) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, x / width));
    const time = percentage * duration;

    setPreviewTime(time);
    setPreviewX(x + rect.left); // Absolute page X or relative? 
    // Component uses fixed/absolute positioning. Let's send e.clientX or x relative to something.
    // TimelinePreview uses fixed left:{xPosition}. So e.clientX is good? No, rect.left + x.
    // Actually, xPosition in TimelinePreview is applied to `left` style.
    // Let's use rect.left + x for page-relative.
    setPreviewX(rect.left + x);
    setPreviewVisible(true);
  };

  const handleTimelineMouseLeave = () => {
    setPreviewVisible(false);
  };

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden font-sans selection:bg-violet-500/30 ${isPlayerActive ? 'bg-transparent' : 'bg-slate-950'}`}>

      {/* 3D Background Mesh Gradient (Hidden when playing) */}
      {!isPlayerActive && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none perspective-[2000px]">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[120px] animate-pulse-slow mix-blend-screen" />
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse-slow delay-1000 mix-blend-screen" />
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow delay-2000 mix-blend-screen" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        </div>
      )}

      {/* Header / Title Bar */}
      {!isPlayerActive ? (
        <header data-tauri-drag-region className="relative z-50 h-16 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 select-none">
          <div className="flex items-center gap-3 group cursor-default pointer-events-none">
            {/* Logo and Title */}
            <img src="/framex-icon.png" alt="Logo" className="w-9 h-9 object-contain opacity-90 drop-shadow-md" />
            <span className="text-xl font-bold text-slate-200 tracking-tight">Frame<span className="text-violet-400">X</span></span>
          </div>

          {/* Settings & Window Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAppSettings(true)}
              className="pointer-events-auto p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all hover:rotate-90 duration-300"
              title="App Settings"
            >
              <Settings size={18} />
            </button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <button onClick={minimizeWindow} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"><Minus size={14} /></button>
            <button onClick={maximizeWindow} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">{isMaximized ? <Copy size={14} className="rotate-180" /> : <Square size={14} />}</button>
            <button onClick={closeWindow} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><X size={14} /></button>
          </div>
        </header>
      ) : (
        !isFullscreen && (
          /* Player Header with Back Navigation */
          <header data-tauri-drag-region className={`relative z-50 h-16 flex items-center justify-between px-6 bg-gradient-to-b from-black/80 to-transparent select-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10 group"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back</span>
              </button>


            </div>

            {/* Minimal Window Controls for Player */}
            <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
              <button onClick={minimizeWindow} className="p-2 text-white hover:bg-white/20 rounded-full"><Minus size={16} /></button>
              <button onClick={maximizeWindow} className="p-2 text-white hover:bg-white/20 rounded-full">{isMaximized ? <Copy size={16} /> : <Square size={16} />}</button>
              <button onClick={closeWindow} className="p-2 text-white hover:bg-red-500/80 rounded-full"><X size={16} /></button>
            </div>
          </header>
        )
      )}

      {/* Main Content (Hidden when playing) */}
      {!isPlayerActive && (
        <main className="relative z-10 flex-1 flex flex-col p-6 perspective-[1000px] overflow-hidden">
          {library.length > 0 ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <button
                    onClick={() => {
                      setLibrary([]);
                      setFile(null);
                    }}
                    className="p-2 -ml-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <Library className="text-violet-400" /> Library <span className="text-slate-500 text-sm font-normal">({library.length} items)</span>
                </h2>
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
                  {/* Sort Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className={`p-2 rounded-md transition-all ${showSortMenu ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                      title="Sort"
                    >
                      <ArrowUpDown size={18} />
                    </button>
                    {showSortMenu && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-lg shadow-xl py-1 z-50 animate-fade-in">
                        {/* Name Sort */}
                        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</div>
                        <button onClick={() => { setSortOption('name-asc'); setShowSortMenu(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between ${sortOption === 'name-asc' ? 'text-violet-400' : 'text-slate-300'}`}>
                          <span>A to Z</span>
                          {sortOption === 'name-asc' && <Check size={14} />}
                        </button>
                        <button onClick={() => { setSortOption('name-desc'); setShowSortMenu(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between ${sortOption === 'name-desc' ? 'text-violet-400' : 'text-slate-300'}`}>
                          <span>Z to A</span>
                          {sortOption === 'name-desc' && <Check size={14} />}
                        </button>

                        <div className="h-px bg-white/10 my-1" />

                        {/* Size Sort */}
                        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><FileText size={12} /> Size</div>
                        <button onClick={() => { setSortOption('size-asc'); setShowSortMenu(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between ${sortOption === 'size-asc' ? 'text-violet-400' : 'text-slate-300'}`}>
                          <span>Smallest First</span>
                          {sortOption === 'size-asc' && <Check size={14} />}
                        </button>
                        <button onClick={() => { setSortOption('size-desc'); setShowSortMenu(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between ${sortOption === 'size-desc' ? 'text-violet-400' : 'text-slate-300'}`}>
                          <span>Largest First</span>
                          {sortOption === 'size-desc' && <Check size={14} />}
                        </button>

                        <div className="h-px bg-white/10 my-1" />

                        {/* Duration Sort */}
                        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Clock size={12} /> Duration</div>
                        <button onClick={() => { setSortOption('duration-asc'); setShowSortMenu(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between ${sortOption === 'duration-asc' ? 'text-violet-400' : 'text-slate-300'}`}>
                          <span>Shortest First</span>
                          {sortOption === 'duration-asc' && <Check size={14} />}
                        </button>
                        <button onClick={() => { setSortOption('duration-desc'); setShowSortMenu(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between ${sortOption === 'duration-desc' ? 'text-violet-400' : 'text-slate-300'}`}>
                          <span>Longest First</span>
                          {sortOption === 'duration-desc' && <Check size={14} />}
                        </button>

                        <div className="h-px bg-white/10 my-1" />

                        {/* Date Sort */}
                        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><CalendarIcon size={12} /> Date</div>
                        <button onClick={() => { setSortOption('date-asc'); setShowSortMenu(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between ${sortOption === 'date-asc' ? 'text-violet-400' : 'text-slate-300'}`}>
                          <span>Oldest First</span>
                          {sortOption === 'date-asc' && <Check size={14} />}
                        </button>
                        <button onClick={() => { setSortOption('date-desc'); setShowSortMenu(false); }} className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between ${sortOption === 'date-desc' ? 'text-violet-400' : 'text-slate-300'}`}>
                          <span>Newest First</span>
                          {sortOption === 'date-desc' && <Check size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}><Grid size={18} /></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}><List size={18} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                  {sortedLibrary.map((entry, _) => (
                    <ThumbnailCard
                      key={entry.path}
                      path={entry.path}
                      entry={entry}
                      viewMode={viewMode}
                      onPlay={() => handlePlay(entry.path)}
                      addToQueue={addToQueue}
                      removeFromProcessing={removeFromProcessing}
                      shouldLoad={processing.includes(entry.path)}
                      thumbnailCache={thumbnailCache}
                      setThumbnailCache={setThumbnailCache}
                      previewCache={previewCache}
                      setPreviewCache={setPreviewCache}
                      duration={durationCache[entry.path]}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <button onClick={handleOpenFolder} className="text-sm text-slate-400 hover:text-white underline decoration-dashed underline-offset-4">Open User Folder</button>
              </div>
            </div>
          ) : currentFile ? (
            <div className="h-full flex flex-col items-center justify-center">
              <TiltCard className="w-full max-w-xl aspect-video bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />

                <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="mb-6 relative">
                    <div className="absolute inset-0 bg-violet-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full" />
                    <MonitorPlay size={48} className="text-violet-200 relative z-10 drop-shadow-lg" />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight line-clamp-2 leading-snug">{fileName}</h2>
                  <p className="text-slate-400 text-sm mb-8">Ready to initiate playback</p>

                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm justify-center">
                    <button
                      onClick={() => handlePlay()}
                      disabled={isLoading}
                      className="flex-1 bg-white text-slate-950 hover:bg-violet-50 hover:scale-105 active:scale-95 transition-all duration-300 font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-white/5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                    >
                      {isLoading ? <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : <Play size={20} fill="currentColor" />}
                      <span>Play Now</span>
                    </button>

                    <button
                      onClick={handleOpenFile}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 transition-all duration-300 font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 backdrop-blur-sm"
                    >
                      <FolderOpen size={18} />
                      <span>Change</span>
                    </button>
                  </div>
                </div>
              </TiltCard>
              <button onClick={handleOpenFolder} className="mt-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
                <Library size={16} /> or switch to Library View
              </button>
            </div>
          ) : (
            <HomeScreen onOpenFile={handleOpenFile} onOpenFolder={handleOpenFolder} />
          )}
        </main>
      )}

      {/* Player Click Overlay & Gestures */}
      {isPlayerActive && (
        <div
          className="flex-1 w-full relative z-40 transition-opacity duration-200 hover:bg-white/5"
          onPointerDown={gestureHandlers.handlePointerDown}
          onPointerMove={gestureHandlers.handlePointerMove}
          onPointerUp={gestureHandlers.handlePointerUp}
          onDoubleClick={gestureHandlers.handleDoubleClick}
          title="Tap to Pause, Double Tap for Fullscreen, Drag R-Side for Volume"
        />
      )}

      {/* Control Bar - Extended */}
      {isPlayerActive && (
        <footer className={`relative z-50 min-h-20 px-4 md:px-8 py-3 backdrop-blur-xl bg-slate-950/90 border-t border-white/5 flex flex-col gap-3 mt-auto transition-opacity duration-300 ${!showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

          {/* Progress Bar */}
          <div className="w-full flex items-center gap-3 px-1 my-1 relative group/timeline">
            <TimelinePreview
              path={currentFile || ""}
              time={previewTime}
              duration={duration}
              visible={previewVisible}
              xPosition={previewX}
            />

            <span className="text-xs font-medium text-slate-300 w-12 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentTime(val);
                invoke("mpv_seek_absolute", { position: val });
              }}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseMove={handleTimelineMouseMove}
              onMouseLeave={handleTimelineMouseLeave}
              className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-125 transition-all
              [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 z-20 relative"
              style={{
                background: `linear-gradient(to right, rgb(139 92 246) 0%, rgb(139 92 246) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
            <span className="text-xs font-medium text-slate-300 w-12">-{formatTime(Math.max(0, duration - currentTime))}</span>
          </div>

          {/* Top Row: Skip Controls */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* Backward Skip Buttons */}
            <div className="flex items-center gap-1">
              <button onClick={() => handleSeek(-60)} className="px-2 py-1 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors" title="-60s">
                -60s
              </button>
              <button onClick={() => handleSeek(-30)} className="px-2 py-1 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors" title="-30s">
                -30s
              </button>
              <button onClick={() => handleSeek(-10)} className="px-2 py-1 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors" title="-10s">
                -10s
              </button>
              <button
                onClick={playPreviousVideo}
                disabled={sortedLibrary.length === 0 || sortedLibrary.findIndex(v => v.path === (currentFile || "")) <= 0}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous Video"
              >
                <SkipBack size={18} />
              </button>
            </div>

            {/* Play/Pause */}
            <button onClick={togglePause} className="w-12 h-12 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-white/10 mx-2">
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>

            {/* Forward Skip Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={playNextVideo}
                disabled={sortedLibrary.length === 0 || sortedLibrary.findIndex(v => v.path === (currentFile || "")) >= sortedLibrary.length - 1}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Video"
              >
                <SkipForward size={18} />
              </button>
              <button onClick={() => handleSeek(10)} className="px-2 py-1 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors" title="+10s">
                +10s
              </button>
              <button onClick={() => handleSeek(30)} className="px-2 py-1 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors" title="+30s">
                +30s
              </button>
              <button onClick={() => handleSeek(60)} className="px-2 py-1 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors" title="+60s">
                +60s
              </button>
            </div>
          </div>

          {/* Bottom Row: Volume & Settings */}
          <div className="flex items-center justify-between gap-4">
            {/* Volume Control */}
            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <button
                onClick={() => handleVolume(volume === 0 ? 100 : 0)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                title={volume === 0 ? 'Unmute' : 'Mute'}
              >
                <Volume2 size={18} />
              </button>
              <input
                type="range"
                min="0"
                max="300"
                value={volume}
                onChange={(e) => handleVolume(Number(e.target.value))}
                className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                style={{
                  background: `linear-gradient(to right, rgb(139 92 246) 0%, rgb(139 92 246) ${volume / 3}%, rgba(255,255,255,0.1) ${volume / 3}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
              <span className={`text-xs font-mono min-w-[3rem] text-right ${volume > 100 ? 'text-orange-400' : 'text-slate-400'}`}>
                {volume}%
              </span>
            </div>

            {/* Quick Volume Presets */}
            <div className="hidden sm:flex items-center gap-1">
              {[50, 100, 150, 200, 300].map((v) => (
                <button
                  key={v}
                  onClick={() => handleVolume(v)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${volume === v
                    ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                >
                  {v}%
                </button>
              ))}
            </div>

            {/* Right: Settings and Maximizer */}
            <div className="flex items-center gap-2">

              {/* Subtitle Control */}
              <div className="relative">
                <button
                  onClick={() => { invoke('mpv_get_tracks'); setShowSubsMenu(!showSubsMenu); }}
                  className={`p-2 rounded-full transition-all ${showSubsMenu ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  title="Subtitles"
                >
                  <Captions size={20} />
                </button>
                {showSubsMenu && (
                  <div className="absolute bottom-full mb-2 right-0 w-48 max-h-60 overflow-y-auto bg-slate-900 border border-white/10 rounded-lg shadow-xl flex flex-col py-1 animate-fade-in scrollbar-hide">
                    <button
                      onClick={() => handleSubTrack("no")}
                      className={`px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors flex justify-between items-center ${!tracks.some(t => t.type === 'sub' && t.selected) ? 'text-violet-400 font-bold' : 'text-slate-300'}`}
                    >
                      <span>Off</span>
                      {!tracks.some(t => t.type === 'sub' && t.selected) && <Check size={14} />}
                    </button>
                    {tracks.filter(t => t.type === 'sub').map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleSubTrack(t.id)}
                        className={`px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors flex justify-between items-center ${t.selected ? 'text-violet-400 font-bold' : 'text-slate-300'}`}
                      >
                        <span className="truncate pr-2">{t.title || `Track ${t.id}`} ({t.lang || 'unk'})</span>
                        {t.selected && <Check size={14} />}
                      </button>
                    ))}
                    {tracks.filter(t => t.type === 'sub').length === 0 && (
                      <div className="px-3 py-2 text-xs text-white/30 italic">No subtitles</div>
                    )}
                  </div>
                )}
              </div>

              {/* Speed Control */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-2 py-1 text-xs font-bold text-white/90 bg-white/10 hover:bg-white/20 rounded-md transition-all border border-white/5"
                >
                  {playbackSpeed}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-2 right-0 w-24 bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden flex flex-col py-1 animate-fade-in">
                    {[0.25, 0.5, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0].map(s => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors ${playbackSpeed === s ? 'text-violet-400 font-bold' : 'text-slate-300'}`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                title="Settings"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          autoHideDuration={autoHideDuration}
          setAutoHideDuration={setAutoHideDuration}
          loopMode={loopMode}
          setLoopMode={setLoopMode}
        />
      )}

      {/* App Settings Modal */}
      {showAppSettings && (
        <EnhancedSettingsModal onClose={() => setShowAppSettings(false)} />
      )}
    </div>
  );
}

// Reusable 3D Tilt Component
function TiltCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate rotation (-10 to 10 deg)
    const xRot = ((y - rect.height / 2) / rect.height) * -10;
    const yRot = ((x - rect.width / 2) / rect.width) * 10;

    setRotation({ x: xRot, y: yRot });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{
        transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1, 1, 1)`,
      }}
    >
      {children}
    </div>
  );
}

// Thumbnail Card Component with async loading
function ThumbnailCard({ path, entry, viewMode, onPlay, addToQueue, removeFromProcessing, shouldLoad, thumbnailCache, setThumbnailCache, previewCache, setPreviewCache, duration }: {
  path: string,
  entry: VideoEntry,
  viewMode: 'grid' | 'list',
  onPlay: () => void,
  addToQueue: (path: string) => void,
  removeFromProcessing: (path: string) => void,
  shouldLoad: boolean,
  thumbnailCache: Record<string, string>,
  setThumbnailCache: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  previewCache: Record<string, string>,
  setPreviewCache: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  duration?: number
}) {
  // Use cached thumbnail if available
  const thumb = thumbnailCache[path] || null;
  const preview = previewCache[path] || null;
  const [hasRequested, setHasRequested] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false); // Track preview load errors
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Add to queue on mount (only if not already cached)
    if (!thumbnailCache[path]) {
      addToQueue(path);
    }
  }, [path, addToQueue, thumbnailCache]);

  // Reset error when path changes
  useEffect(() => {
    setPreviewError(false);
  }, [path]);

  useEffect(() => {
    if (shouldLoad && !hasRequested && !thumb) {
      setHasRequested(true);

      async function loadThumb() {
        try {
          const data = await invoke<string>("generate_thumbnail", { videoPath: path });
          // Store in parent cache (persists even if this component unmounts)
          setThumbnailCache(prev => ({ ...prev, [path]: data }));
        } catch (e) {
          console.error("Thumb error for", path, ":", e);
        } finally {
          removeFromProcessing(path);
        }
      }
      loadThumb();
    }
  }, [shouldLoad, hasRequested, thumb, path, removeFromProcessing, setThumbnailCache]);

  // Handle hover preview loading
  useEffect(() => {
    if (isHovered && !preview && !previewError) {
      hoverTimeoutRef.current = window.setTimeout(async () => {
        try {
          const data = await invoke<string>("generate_preview", { videoPath: path });
          setPreviewCache(prev => ({ ...prev, [path]: data }));
        } catch (e) {
          console.error("Preview error for", path, ":", e);
          setPreviewError(true);
        }
      }, 600); // 600ms delay before loading preview
    } else {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    }
    return () => {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isHovered, preview, previewError, path, setPreviewCache]);

  return (
    <div
      onDoubleClick={onPlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-violet-500/50 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${viewMode === 'list' ? 'flex items-center gap-4 p-4' : 'aspect-video flex flex-col'}`}
    >
      <div className={`${viewMode === 'list' ? 'w-24 h-16 shrink-0' : 'flex-1'} relative flex items-center justify-center bg-black/40 group-hover:bg-violet-500/20 transition-colors overflow-hidden`}>
        {isHovered && preview && !previewError ? (
          <img
            src={preview}
            alt=""
            className="absolute inset-0 w-full h-full object-cover animate-fade-in"
            onError={() => setPreviewError(true)}
          />
        ) : thumb ? (
          <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
        ) : (
          <Film className={`text-slate-600 group-hover:text-violet-400 transition-colors ${viewMode === 'list' ? 'w-6 h-6' : 'w-10 h-10'} ${shouldLoad ? 'animate-pulse' : ''}`} />
        )}

        {/* Hover Overlay with Play Button - Only show if not previewing (or keep it?) */}
        {/* If preview is playing, maybe hide the play button overlay to let user see preview? Or keep it for clarity? User said "preview of video". Usually preview replaces static thumb but overlay remains. */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 bg-gradient-to-t from-black/80 via-black/50 to-black/30 z-10 ${isHovered && !preview ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg shadow-lg shadow-violet-500/30 transform hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Play size={18} fill="currentColor" />
            <span>Play Video</span>
          </button>
        </div>

        {/* If preview IS showing, we might want a small indicator or just let it play. 
            The gradient overlay might obscure the preview. Let's make it more transparent or auto-hide after a while?
            For now, let's keep it simple: Show preview instead of thumb. The play button overlay is nice but blocks view.
            I used `opacity-0` above when preview is active? 
            Actually, the user wants PREVIEW.
            If I make overlay disappear when preview is ready, user can see the video.
            I changed the condition above: `${isHovered && !preview ? 'opacity-100' : 'opacity-0'}`
            Wait, if preview loads, `preview` is truthy, so `!preview` is false -> opacity-0.
            But `isHovered` is true.
            So when preview loads, the play button disappears? That might be confusing.
            Maybe keep the play button but make it smaller or less intrusive?
            Or maybe show it only on hover but if preview plays, just show a small play icon in corner?
            Let's stick to standard behavior: Preview plays, but controls/overlay are minimal.
            I'll just let the play button hide when preview starts so user can see content.
        */}
      </div>
      <div className={`p-3 ${viewMode === 'list' ? 'flex-1 min-w-0' : 'relative z-20 bg-gradient-to-t from-black/80 to-transparent -mt-12 pt-8 pointer-events-none'}`}>
        <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors drop-shadow-md">
          {path.split(/[\\/]/).pop()}
        </p>
        <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center justify-between">
          <span className={viewMode !== 'list' ? 'hidden' : ''}>{path}</span>
          <span className="flex items-center gap-2">
            <span>{(entry.size / (1024 * 1024)).toFixed(1)} MB</span>
            {duration && <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>}
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;
