# FrameX - Media Player

FrameX is a modern, high-performance media player built with Tauri, React, and Vite. It leverages the power of Rust for the backend and the flexibility of React for the user interface, providing a seamless media playback experience.

## Features

- **Modern UI**: Sleek and responsive interface designed with Tailwind CSS.
- **High Performance**: Built on Tauri for a lightweight and fast native experience.
- **Media Playback**: Supports various audio and video formats.
- **Overlay Mode**: Includes a player overlay for multitasking.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or later)
- **Rust & Cargo** (required for Tauri)
  - Follow the [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) guide to set up your environment.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Deveshsamant/FrameX---Media-Player.git
    cd FrameX---Media-Player
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

## Usage

### Development

To run the application in development mode with hot-reloading:

```bash
npm run tauri dev
```

This command will start the frontend dev server and the Tauri application window.

### Build

To build the application for production:

```bash
npm run tauri build
```

This will create a dedicated installer or executable for your operating system in the `src-tauri/target/release/bundle` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
