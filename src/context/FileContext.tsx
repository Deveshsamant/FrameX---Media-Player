import { createContext, useContext, useState, ReactNode } from 'react';

interface FileContextType {
    currentFile: string | null;
    setFile: (path: string | null) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
    const [currentFile, setCurrentFile] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const setFile = (path: string | null) => {
        setCurrentFile(path);
        // Here we can check if path is valid or trigger other actions
    };

    return (
        <FileContext.Provider value={{ currentFile, setFile, isLoading, setIsLoading }}>
            {children}
        </FileContext.Provider>
    );
}

export function useFile() {
    const context = useContext(FileContext);
    if (context === undefined) {
        throw new Error('useFile must be used within a FileProvider');
    }
    return context;
}
