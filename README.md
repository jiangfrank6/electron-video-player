# Electron Video Player

A modern desktop video player built with Electron, React, and Tailwind CSS. Features a sleek dark theme, comprehensive video queue management, and a convenient miniplayer mode.

## Features

- 🎥 Play local video files with support for multiple formats
- 📋 Video queue management with drag-and-drop reordering
- 🔄 Autoplay functionality for continuous playback
- 🎮 Intuitive playback controls
- 🎯 Progress bar with time preview and seek functionality
- 🔊 Volume control with mute toggle
- 📺 Fullscreen support
- 🖥️ Miniplayer mode with draggable and resizable window
- 🎨 Modern dark theme with beautiful UI
- ⌨️ Comprehensive keyboard shortcuts
- 🔍 Search functionality in video queue
- ➕ Easy video addition with drag-and-drop or file picker

## Keyboard Shortcuts

- `Space` - Play/Pause
- `←/→` - Skip backward/forward 5 seconds
- `↑/↓` - Increase/decrease volume
- `M` - Toggle mute
- `F` - Toggle fullscreen
- `PageUp/PageDown` - Previous/Next video in queue
- `Esc` - Exit fullscreen or miniplayer mode

## Tech Stack

- Electron - Desktop application framework
- React - UI framework
- Vite - Build tool and development server
- Tailwind CSS - Styling
- Lucide React - Modern icon set
- @hello-pangea/dnd - Drag and drop functionality

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/jiangfrank6/electron-video-player.git
cd electron-video-player
```

2. Install dependencies:
```bash
npm install
```

3. Install required packages:
```bash
# Install drag and drop functionality
npm install @hello-pangea/dnd

# Install icon library (if not already installed)
npm install lucide-react
```

4. Start the development server:
```bash
npm run dev
```

The application will start in development mode with hot reload enabled.

## Build

To build the application for production:
```bash
npm run build
```

The built application will be available in the `dist` directory.

## Project Structure

```
electron-video-player/
├── src/                    # Source files
│   ├── components/         # React components
│   ├── styles/            # CSS and Tailwind styles
│   └── main.jsx           # React entry point
├── main.cjs               # Electron main process
├── vite.config.js         # Vite configuration
└── package.json           # Project dependencies and scripts
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 