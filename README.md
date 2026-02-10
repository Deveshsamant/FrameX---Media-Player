# FrameX - Media Player

FrameX is a modern, high-performance media player built with Tauri, React, and Vite. It combines the power of Rust backend with a sleek React frontend to deliver a premium cinematic experience.

## Features

- **Modern UI**: Beautiful dark-themed interface with glassmorphism effects and smooth animations.
- **High Performance**: Native performance powered by Tauri and Rust.
- **Media Playback**: Professional-grade playback engine based on `libmpv`.
- **AI Subtitles**: Generate English subtitles locally using OpenAI Whisper (privacy-focused, no cloud keys required).
- **Smart Library**: Auto-detects media files, remembers playback positions, and supports folder navigation.
- **Customizable**: extensive settings for playback, themes, and UI preferences.

## Prerequisites

Before running the application, ensure you have the following installed:

1.  **Node.js** (v16+)
2.  **Rust & Cargo** (latest stable)
    -   Follow the [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) guide.
3.  **Python 3.8+** (Required for Whisper AI)
4.  **FFmpeg** (Required for Whisper and thumbnail generation)
    -   Ensure `ffmpeg` is in your system PATH.
5.  **OpenAI Whisper**:
    ```bash
    pip install openai-whisper
    ```

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Deveshsamant/FrameX---Media-Player.git
    cd FrameX---Media-Player
    ```

2.  Install frontend dependencies:
    ```bash
    npm install
    ```

## Usage

### Development

To run the application in development mode with hot-reloading:

```bash
npm run tauri dev
```

### Build

To create a production build for your OS:

```bash
npm run tauri build
```

The installer/imaged executable will be in `src-tauri/target/release/bundle`.

## Contributing

Contributions are welcome! Please submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
