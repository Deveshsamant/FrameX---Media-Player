export interface AppSettings {
    // Theme
    themeId: string;

    // Playback
    defaultVolume: number;
    autoPlay: boolean;
    rememberPosition: boolean;
    defaultSpeed: number;

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
}

export const defaultSettings: AppSettings = {
    themeId: 'midnight-purple',
    defaultVolume: 50,
    autoPlay: false,
    rememberPosition: true,
    defaultSpeed: 1.0,
    autoHideDelay: 1000,
    showFeatureCards: true,
    compactMode: false,
    enableTimelinePreview: true,
    animationSpeed: 'normal',
    hardwareAcceleration: true,
    thumbnailCacheSize: 100,
    defaultLibraryView: 'grid',
};
