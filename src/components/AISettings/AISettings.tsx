import React, { useState, useEffect } from 'react';

interface AISettingsProps {
    apiKey: string;
    onApiKeyChange: (key: string) => void;
}

export const AISettings: React.FC<AISettingsProps> = ({
    apiKey,
    onApiKeyChange,
}) => {
    const [localKey, setLocalKey] = useState(apiKey);
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        // Load from localStorage
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            setLocalKey(savedKey);
            onApiKeyChange(savedKey);
        }
    }, []);

    const handleSaveKey = () => {
        localStorage.setItem('gemini_api_key', localKey);
        onApiKeyChange(localKey);
    };

    return (
        <div className="p-6 bg-black/50 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-4">AI Settings</h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Google Gemini API Key
                    </label>
                    <p className="text-xs text-gray-400 mb-2">
                        Get your free API key from{' '}
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                        >
                            Google AI Studio
                        </a>
                    </p>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={localKey}
                            onChange={(e) => setLocalKey(e.target.value)}
                            placeholder="Enter your Gemini API key"
                            className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        />
                        <button
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            {showKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSaveKey}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                    Save API Key
                </button>

                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-300 mb-2">
                        AI Features
                    </h4>
                    <ul className="text-xs text-gray-300 space-y-1">
                        <li>• Auto-generate subtitles using Whisper</li>
                        <li>• Get video summaries</li>
                        <li>• Mood-based tagging</li>
                        <li>• Smart chapter detection</li>
                    </ul>
                </div>

                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <h4 className="text-sm font-semibold text-yellow-300 mb-2">
                        Requirements
                    </h4>
                    <p className="text-xs text-gray-300">
                        Whisper must be installed on your system. Install via:{' '}
                        <code className="bg-black/50 px-1 py-0.5 rounded">
                            pip install openai-whisper
                        </code>
                    </p>
                </div>
            </div>
        </div>
    );
};
