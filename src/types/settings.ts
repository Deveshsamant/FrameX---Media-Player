export interface KeyboardShortcuts {
    togglePause: string;
    seekForward: string;
    seekBackward: string;
    volumeUp: string;
    volumeDown: string;
    fullscreen: string;
    mute: string;
}

export const defaultShortcuts: KeyboardShortcuts = {
    togglePause: ' ',
    seekForward: 'ArrowRight',
    seekBackward: 'ArrowLeft',
    volumeUp: 'ArrowUp',
    volumeDown: 'ArrowDown',
    fullscreen: 'f',
    mute: 'm',
};

export const shortcutLabels: Record<keyof KeyboardShortcuts, string> = {
    togglePause: 'Play / Pause',
    seekForward: 'Seek Forward (5s)',
    seekBackward: 'Seek Backward (5s)',
    volumeUp: 'Volume Up',
    volumeDown: 'Volume Down',
    fullscreen: 'Toggle Fullscreen',
    mute: 'Toggle Mute',
};

export interface AppSettings {
    // Theme
    themeId: string;

    // Playback
    defaultVolume: number;
    autoPlay: boolean;
    rememberPosition: boolean;
    defaultSpeed: number;
    loopMode: 'off' | 'one' | 'all';
    aspectRatio: string;

    // UI
    autoHideDelay: number;
    showFeatureCards: boolean;
    compactMode: boolean;
    enableTimelinePreview: boolean;
    animationSpeed: 'slow' | 'normal' | 'fast';

    // Advanced
    hardwareAcceleration: boolean;
    thumbnailCacheSize: number;
    defaultLibraryView: 'grid' | 'list';

    // Integrations
    discordRPC: boolean;
    openSubtitlesApiKey: string;
    defaultSubtitleLanguage: string;

    // Video Image Controls (defaults)
    videoBrightness: number;
    videoContrast: number;
    videoSaturation: number;
    videoGamma: number;

    // Keyboard Shortcuts
    keyboardShortcuts: KeyboardShortcuts;
}

export const defaultSettings: AppSettings = {
    themeId: 'midnight-purple',
    defaultVolume: 50,
    autoPlay: false,
    rememberPosition: true,
    defaultSpeed: 1.0,
    loopMode: 'off',
    aspectRatio: '-1',
    autoHideDelay: 1000,
    showFeatureCards: true,
    compactMode: false,
    enableTimelinePreview: true,
    animationSpeed: 'normal',
    hardwareAcceleration: true,
    thumbnailCacheSize: 100,
    defaultLibraryView: 'grid',
    discordRPC: false,
    openSubtitlesApiKey: '',
    defaultSubtitleLanguage: 'en',
    videoBrightness: 0,
    videoContrast: 0,
    videoSaturation: 0,
    videoGamma: 0,
    keyboardShortcuts: { ...defaultShortcuts },
};
