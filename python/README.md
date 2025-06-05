# MKV Subtitle Extractor

A Python module for extracting subtitles from MKV files using FFmpeg.

## Prerequisites

- Python 3.6 or higher
- FFmpeg installed and accessible in your system PATH
  - On macOS: `brew install ffmpeg`
  - On Ubuntu/Debian: `sudo apt-get install ffmpeg`
  - On Windows: Download from [FFmpeg official website](https://ffmpeg.org/download.html)

## Installation

1. Clone or download this repository
2. Make sure FFmpeg is installed and accessible in your system PATH

## Usage

```python
from subtitle_extractor import SubtitleExtractor

# Create an instance of SubtitleExtractor
extractor = SubtitleExtractor()

# Get information about available subtitle tracks
mkv_file = "path/to/your/video.mkv"
tracks = extractor.get_subtitle_tracks(mkv_file)

# Print available subtitle tracks
for track in tracks:
    print(f"Stream #{track['index']}: {track.get('tags', {}).get('language', 'unknown')}")

# Extract subtitles (automatically uses the first subtitle track)
output_file = "subtitles.srt"
result = extractor.extract_subtitle(mkv_file, output_file)

# Extract a specific subtitle track by index
result = extractor.extract_subtitle(mkv_file, output_file, stream_index=1)  # Extract second subtitle track
```

## Features

- List all available subtitle tracks in an MKV file
- Extract subtitles to SRT format
- Support for selecting specific subtitle tracks
- Automatic creation of output directories
- Error handling for common issues

## Error Handling

The module includes error handling for common scenarios:
- File not found
- No subtitle tracks available
- FFmpeg execution errors
- Invalid subtitle track selection

## License

This project is open source and available under the MIT License. 