export interface Playlist {
    id: string;
    name: string;
    items: string[];
    created: number;
    modified: number;
}

export interface Collection {
    id: string;
    name: string;
    description: string;
    items: string[];
    poster_path?: string;
}

export interface SubtitleResult {
    id: string;
    file_name: string;
    language: string;
    download_count: number;
    hearing_impaired: boolean;
    file_id: number;
    release: string;
}
