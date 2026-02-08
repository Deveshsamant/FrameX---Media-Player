export interface Theme {
    id: string;
    name: string;
    colors: {
        // Primary colors
        primary: string;
        primaryHover: string;
        primaryLight: string;
        primaryDark: string;

        // Secondary colors
        secondary: string;
        secondaryHover: string;
        secondaryLight: string;

        // Accent colors
        accent: string;
        accentHover: string;

        // Background colors
        bg: string;
        bgSecondary: string;
        bgTertiary: string;

        // Text colors
        text: string;
        textSecondary: string;
        textMuted: string;

        // Border colors
        border: string;
        borderHover: string;

        // Gradient colors
        gradientFrom: string;
        gradientTo: string;

        // Feature card colors
        cardBg: string;
        cardBorder: string;
        cardHover: string;
    };
}

export type ThemeId =
    | 'midnight-purple'
    | 'ocean-blue'
    | 'crimson-red'
    | 'emerald-green'
    | 'sunset-orange'
    | 'rose-gold'
    | 'cyberpunk'
    | 'monochrome'
    | 'forest'
    | 'lavender-dreams';
