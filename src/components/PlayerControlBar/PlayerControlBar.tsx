import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './PlayerControlBar.css';

interface PlaybackState {
    currentTime: number;
    duration: number;
    volume: number;
    isPaused: boolean;
    isMuted: boolean;
    playbackSpeed: number;
    currentAudioTrack: number;
    currentSubtitleTrack: number;
}

const PlayerControlBar: React.FC = () => {
    const [state, setState] = useState<PlaybackState>({
        currentTime: 0,
        duration: 0,
        volume: 100,
        isPaused: true,
        isMuted: false,
        playbackSpeed: 1.0,
        currentAudioTrack: 0,
        currentSubtitleTrack: 0,
    });

    const [isVisible, setIsVisible] = useState(true);
    // Dragging state for progress bar scrubbing (future enhancement)
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);

    // Format time as MM:SS or HH:MM:SS
    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // MPV Control Functions
    const togglePlay = useCallback(async () => {
        try {
            await invoke('mpv_toggle_pause');
            setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
        } catch (e) { console.error('Play toggle failed:', e); }
    }, []);

    const seek = useCallback(async (seconds: number) => {
        try {
            await invoke('mpv_seek', { seconds });
        } catch (e) { console.error('Seek failed:', e); }
    }, []);

    const seekTo = useCallback(async (position: number) => {
        try {
            await invoke('mpv_seek_absolute', { position });
        } catch (e) { console.error('Seek to failed:', e); }
    }, []);

    const setVolume = useCallback(async (volume: number) => {
        try {
            await invoke('mpv_set_volume', { volume });
            setState(prev => ({ ...prev, volume, isMuted: volume === 0 }));
        } catch (e) { console.error('Set volume failed:', e); }
    }, []);

    const toggleMute = useCallback(async () => {
        try {
            await invoke('mpv_toggle_mute');
            setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
        } catch (e) { console.error('Mute toggle failed:', e); }
    }, []);

    const setPlaybackSpeed = useCallback(async (speed: number) => {
        try {
            await invoke('mpv_set_speed', { speed });
            setState(prev => ({ ...prev, playbackSpeed: speed }));
            setShowSpeedMenu(false);
        } catch (e) { console.error('Set speed failed:', e); }
    }, []);

    const toggleFullscreen = useCallback(async () => {
        try {
            await invoke('mpv_toggle_fullscreen');
        } catch (e) { console.error('Fullscreen toggle failed:', e); }
    }, []);

    const cycleSubtitles = useCallback(async () => {
        try {
            await invoke('mpv_cycle_subtitles');
        } catch (e) { console.error('Cycle subtitles failed:', e); }
    }, []);

    const cycleAudio = useCallback(async () => {
        try {
            await invoke('mpv_cycle_audio');
        } catch (e) { console.error('Cycle audio failed:', e); }
    }, []);

    // Progress bar click handler
    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const newTime = pos * state.duration;
        seekTo(newTime);
        setState(prev => ({ ...prev, currentTime: newTime }));
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    seek(-5);
                    break;
                case 'ArrowRight':
                    seek(5);
                    break;
                case 'ArrowUp':
                    setVolume(Math.min(state.volume + 5, 150));
                    break;
                case 'ArrowDown':
                    setVolume(Math.max(state.volume - 5, 0));
                    break;
                case 'm':
                case 'M':
                    toggleMute();
                    break;
                case 'f':
                case 'F':
                    toggleFullscreen();
                    break;
                case '1':
                    seek(-10);
                    break;
                case '2':
                    seek(-30);
                    break;
                case '3':
                    seek(-60);
                    break;
                case '4':
                    seek(10);
                    break;
                case '5':
                    seek(30);
                    break;
                case '6':
                    seek(60);
                    break;
                case 'c':
                case 'C':
                    cycleSubtitles();
                    break;
                case 'a':
                case 'A':
                    cycleAudio();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.volume, togglePlay, seek, setVolume, toggleMute, toggleFullscreen, cycleSubtitles, cycleAudio]);

    // Listen for state updates from MPV backend
    useEffect(() => {
        const unlistenPromise = listen<PlaybackState>('mpv-state-update', (event) => {
            setState(event.payload);
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    // Auto-hide logic
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const handleMouseMove = () => {
            setIsVisible(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setIsVisible(false), 3000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeout);
        };
    }, []);

    const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
    const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

    return (
        <div className={`player-control-bar ${isVisible ? 'visible' : 'hidden'}`}>
            {/* Progress Bar */}
            <div className="progress-container">
                <span className="time current-time">{formatTime(state.currentTime)}</span>
                <div className="progress-bar" onClick={handleProgressClick}>
                    <div className="progress-bg"></div>
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    <div className="progress-handle" style={{ left: `${progress}%` }}></div>
                </div>
                <span className="time duration">{formatTime(state.duration)}</span>
            </div>

            {/* Controls Row */}
            <div className="controls-row">
                {/* Left Section */}
                <div className="controls-left">
                    <button className="control-btn" title="Playlist">
                        <svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z" /></svg>
                    </button>
                    <button className="control-btn" title="Subtitles (C)" onClick={cycleSubtitles}>
                        <svg viewBox="0 0 24 24"><path d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" /></svg>
                    </button>
                    <div className="volume-control" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
                        <button className="control-btn" title="Volume (M)" onClick={toggleMute}>
                            {state.isMuted || state.volume === 0 ? (
                                <svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                            ) : state.volume < 50 ? (
                                <svg viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                            )}
                        </button>
                        {showVolumeSlider && (
                            <div className="volume-slider-container">
                                <input
                                    type="range"
                                    className="volume-slider"
                                    min="0"
                                    max="150"
                                    value={state.volume}
                                    onChange={(e) => setVolume(Number(e.target.value))}
                                />
                                <span className="volume-value">{Math.round(state.volume)}%</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center Section - Skip & Play Controls */}
                <div className="controls-center">
                    <button className="control-btn skip-btn" title="-60s (3)" onClick={() => seek(-60)}>
                        <span className="skip-text">-60</span>
                    </button>
                    <button className="control-btn skip-btn" title="-30s (2)" onClick={() => seek(-30)}>
                        <span className="skip-text">-30</span>
                    </button>
                    <button className="control-btn skip-btn" title="-10s (1)" onClick={() => seek(-10)}>
                        <span className="skip-text">-10</span>
                    </button>

                    <button className="control-btn nav-btn" title="Previous">
                        <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                    </button>

                    <button className="control-btn play-btn" title="Play/Pause (Space)" onClick={togglePlay}>
                        {state.isPaused ? (
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        )}
                    </button>

                    <button className="control-btn nav-btn" title="Next">
                        <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                    </button>

                    <button className="control-btn skip-btn" title="+10s (4)" onClick={() => seek(10)}>
                        <span className="skip-text">+10</span>
                    </button>
                    <button className="control-btn skip-btn" title="+30s (5)" onClick={() => seek(30)}>
                        <span className="skip-text">+30</span>
                    </button>
                    <button className="control-btn skip-btn" title="+60s (6)" onClick={() => seek(60)}>
                        <span className="skip-text">+60</span>
                    </button>
                </div>

                {/* Right Section */}
                <div className="controls-right">
                    <div className="speed-control">
                        <button className="control-btn" title="Playback Speed" onClick={() => setShowSpeedMenu(!showSpeedMenu)}>
                            <span className="speed-text">{state.playbackSpeed}x</span>
                        </button>
                        {showSpeedMenu && (
                            <div className="speed-menu">
                                {speedOptions.map(speed => (
                                    <button
                                        key={speed}
                                        className={`speed-option ${state.playbackSpeed === speed ? 'active' : ''}`}
                                        onClick={() => setPlaybackSpeed(speed)}
                                    >
                                        {speed}x
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="control-btn" title="Audio Track (A)" onClick={cycleAudio}>
                        <svg viewBox="0 0 24 24"><path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z" /></svg>
                    </button>
                    <button className="control-btn" title="Picture in Picture">
                        <svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" /></svg>
                    </button>
                    <button className="control-btn" title="Fullscreen (F)" onClick={toggleFullscreen}>
                        <svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
                    </button>
                    <button className="control-btn" title="Settings">
                        <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlayerControlBar;
