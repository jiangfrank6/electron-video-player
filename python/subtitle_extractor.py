import subprocess
import os
import json
import logging
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(level=logging.DEBUG,
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SubtitleExtractor:
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        """
        Initialize the SubtitleExtractor.
        
        Args:
            ffmpeg_path (str): Path to ffmpeg executable. Defaults to "ffmpeg" (assumes it's in PATH)
        """
        self.ffmpeg_path = ffmpeg_path
        logger.debug(f"Initialized SubtitleExtractor with ffmpeg_path: {ffmpeg_path}")

    def get_subtitle_tracks(self, mkv_file: str) -> List[Dict]:
        """
        Get information about available subtitle tracks in the MKV file.
        
        Args:
            mkv_file (str): Path to the MKV file
            
        Returns:
            List[Dict]: List of subtitle tracks with their properties
        """
        if not os.path.exists(mkv_file):
            raise FileNotFoundError(f"MKV file not found: {mkv_file}")

        logger.debug(f"Getting subtitle tracks for file: {mkv_file}")
        
        # Use ffprobe to get stream information
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            mkv_file
        ]

        logger.debug(f"Running command: {' '.join(cmd)}")
        
        try:
            # Use subprocess with a timeout to prevent hanging
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=30  # 30 second timeout
            )
            data = json.loads(result.stdout)
            
            # Filter subtitle streams and add their index in the subtitle streams list
            subtitle_streams = []
            subtitle_index = 0
            
            for stream in data.get("streams", []):
                if stream.get("codec_type") == "subtitle":
                    stream["subtitle_index"] = subtitle_index
                    subtitle_streams.append(stream)
                    subtitle_index += 1
            
            logger.debug(f"Found {len(subtitle_streams)} subtitle tracks")
            return subtitle_streams
            
        except subprocess.TimeoutExpired:
            logger.error("ffprobe command timed out")
            raise RuntimeError("Timeout while getting subtitle information")
        except subprocess.CalledProcessError as e:
            logger.error(f"ffprobe command failed: {e.stderr}")
            raise RuntimeError(f"Failed to get subtitle information: {e}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse ffprobe output: {e}")
            raise RuntimeError(f"Failed to parse ffprobe output: {e}")

    def extract_subtitle(self, mkv_file: str, output_file: str, stream_index: Optional[int] = None) -> str:
        """
        Extract subtitles from an MKV file.
        
        Args:
            mkv_file (str): Path to the MKV file
            output_file (str): Path where the subtitle file should be saved
            stream_index (int, optional): Index of the subtitle stream to extract.
                                        If None, extracts the first subtitle stream.
        
        Returns:
            str: Path to the extracted subtitle file
        """
        if not os.path.exists(mkv_file):
            raise FileNotFoundError(f"MKV file not found: {mkv_file}")

        logger.debug(f"Extracting subtitles from: {mkv_file}")
        logger.debug(f"Output file: {output_file}")
        logger.debug(f"Stream index: {stream_index}")

        # Get subtitle tracks
        tracks = self.get_subtitle_tracks(mkv_file)
        if not tracks:
            raise ValueError(f"No subtitle tracks found in {mkv_file}")

        # If no stream index specified, use the first subtitle track
        if stream_index is None:
            track = tracks[0]
        else:
            # Find the track with the matching subtitle_index
            matching_tracks = [t for t in tracks if t["subtitle_index"] == stream_index]
            if not matching_tracks:
                raise ValueError(f"No subtitle track found with index {stream_index}")
            track = matching_tracks[0]
        
        # Get the actual stream index from the file
        actual_stream_index = track["index"]
        
        # Ensure the output directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)

        # Extract subtitles using ffmpeg
        cmd = [
            self.ffmpeg_path,
            "-y",  # Overwrite output file if it exists
            "-i", mkv_file,
            "-map", f"0:{actual_stream_index}",
            "-f", "srt",
            output_file
        ]

        logger.debug(f"Running command: {' '.join(cmd)}")

        try:
            # Use subprocess with a timeout to prevent hanging
            subprocess.run(
                cmd,
                check=True,
                capture_output=True,
                timeout=60  # 60 second timeout
            )
            logger.debug(f"Successfully extracted subtitles to: {output_file}")
            return output_file
        except subprocess.TimeoutExpired:
            logger.error("ffmpeg command timed out")
            raise RuntimeError("Timeout while extracting subtitles")
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            logger.error(f"ffmpeg command failed: {error_msg}")
            raise RuntimeError(f"Failed to extract subtitles: {error_msg}")

def main():
    # Example usage
    extractor = SubtitleExtractor()
    
    # Replace with your MKV file path
    mkv_file = "path/to/your/video.mkv"
    output_file = "subtitles.srt"
    
    try:
        # Get available subtitle tracks
        tracks = extractor.get_subtitle_tracks(mkv_file)
        print("Available subtitle tracks:")
        for track in tracks:
            print(f"Stream #{track['subtitle_index']}: {track.get('tags', {}).get('language', 'unknown')}")
        
        # Extract subtitles
        result = extractor.extract_subtitle(mkv_file, output_file)
        print(f"Subtitles extracted to: {result}")
    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main() 