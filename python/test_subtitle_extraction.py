#!/usr/bin/env python3

import os
import logging
import time
import tempfile
import shutil
from datetime import datetime
from subtitle_extractor import SubtitleExtractor
import json

# Initialize logger at module level
logger = logging.getLogger(__name__)

def setup_logging(output_dir):
    """Setup logging to both file and console."""
    # Create a logs directory inside the output directory
    logs_dir = os.path.join(output_dir, 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    # Create log filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = os.path.join(logs_dir, f'extraction_{timestamp}.log')
    
    # Setup logging format
    log_format = '%(asctime)s - %(levelname)s - %(message)s'
    
    # Configure logging to file
    logging.basicConfig(
        level=logging.DEBUG,
        format=log_format,
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()  # This will also print to console
        ]
    )
    
    return log_file

def extract_single_subtitle(extractor, mkv_file, output_dir, track):
    """Extract a single subtitle track with error handling."""
    try:
        language = track.get('tags', {}).get('language', 'unknown')
        title = track.get('tags', {}).get('title', 'No title')
        stream_index = track['subtitle_index']  # Use subtitle_index instead of index
        
        # Get the episode name from the MKV file
        episode_name = os.path.splitext(os.path.basename(mkv_file))[0]
        
        # Create a filename with the language code and title
        safe_title = ''.join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
        if safe_title:
            output_file = os.path.join(output_dir, f'{episode_name}_{language}_{safe_title}.srt')
        else:
            output_file = os.path.join(output_dir, f'{episode_name}_{language}.srt')
        
        logger.info(f"\nExtracting {language} subtitles (stream #{stream_index})...")
        result = extractor.extract_subtitle(
            mkv_file,
            output_file,
            stream_index=stream_index
        )
        
        # Read the contents of the subtitle file
        with open(result, 'r', encoding='utf-8') as f:
            subtitle_contents = f.read()
        
        logger.info(f"Successfully saved subtitles to: {result}")
        return {
            'status': 'success',
            'language': language,
            'title': title,
            'stream_index': stream_index,
            'output_file': result,
            'contents': subtitle_contents
        }
    except Exception as e:
        logger.error(f"Failed to extract subtitle track {stream_index}: {e}")
        return {
            'status': 'failed',
            'language': language,
            'title': title,
            'stream_index': stream_index,
            'error': str(e)
        }

def save_extraction_summary(output_dir, results, log_file, mkv_file):
    """Save a summary of the extraction results."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    summary_file = os.path.join(output_dir, 'extraction_summary.txt')
    
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(f"Subtitle Extraction Summary\n")
        f.write(f"========================\n")
        f.write(f"Extraction Date: {timestamp}\n")
        f.write(f"Source File: {mkv_file}\n")
        f.write(f"Log File: {os.path.basename(log_file)}\n\n")
        
        # Count successes and failures
        successes = sum(1 for r in results if r['status'] == 'success')
        failures = sum(1 for r in results if r['status'] == 'failed')
        
        f.write(f"Total Tracks Processed: {len(results)}\n")
        f.write(f"Successful Extractions: {successes}\n")
        f.write(f"Failed Extractions: {failures}\n\n")
        
        f.write("Detailed Results:\n")
        f.write("================\n\n")
        
        # First list successful extractions
        f.write("Successful Extractions:\n")
        f.write("---------------------\n")
        for result in results:
            if result['status'] == 'success':
                f.write(f"\nStream #{result['stream_index']}:\n")
                f.write(f"  Language: {result['language']}\n")
                f.write(f"  Title: {result['title']}\n")
                f.write(f"  Output File: {os.path.basename(result['output_file'])}\n")
        
        # Then list failures if any
        if failures > 0:
            f.write("\nFailed Extractions:\n")
            f.write("-----------------\n")
            for result in results:
                if result['status'] == 'failed':
                    f.write(f"\nStream #{result['stream_index']}:\n")
                    f.write(f"  Language: {result['language']}\n")
                    f.write(f"  Title: {result['title']}\n")
                    f.write(f"  Error: {result['error']}\n")
    
    return summary_file

def main():
    # Get the MKV file path from command line arguments
    import sys
    if len(sys.argv) < 2:
        logger.error("Please provide an MKV file path as argument")
        return
    
    mkv_file = sys.argv[1]
    
    # Create a temporary directory for subtitle extraction
    temp_dir = tempfile.mkdtemp(prefix='subtitle_extraction_')
    logger.info(f"Created temporary directory: {temp_dir}")
    
    try:
        # Setup logging in the temporary directory
        log_file = setup_logging(temp_dir)
        
        if not os.path.exists(mkv_file):
            logger.error(f"MKV file not found: {mkv_file}")
            return
        
        # Initialize the subtitle extractor
        extractor = SubtitleExtractor()
        
        try:
            # Get all available subtitle tracks
            logger.info("Analyzing subtitle tracks...")
            tracks = extractor.get_subtitle_tracks(mkv_file)
            
            if not tracks:
                logger.error("No subtitle tracks found in the file.")
                return
            
            logger.info("\nAvailable subtitle tracks:")
            for track in tracks:
                language = track.get('tags', {}).get('language', 'unknown')
                title = track.get('tags', {}).get('title', 'No title')
                logger.info(f"Stream #{track['subtitle_index']}: Language: {language}, Title: {title}")
            
            # Extract each subtitle track to a separate file
            logger.info("\nStarting subtitle extraction...")
            extraction_results = []
            
            for track in tracks:
                # Add a small delay between extractions to prevent system overload
                if extraction_results:
                    time.sleep(1)
                
                result = extract_single_subtitle(extractor, mkv_file, temp_dir, track)
                extraction_results.append(result)
            
            # Save extraction summary
            summary_file = save_extraction_summary(temp_dir, extraction_results, log_file, mkv_file)
            
            # Log final status
            successful_extractions = sum(1 for r in extraction_results if r['status'] == 'success')
            logger.info(f"\nExtraction completed. Successfully extracted {successful_extractions} out of {len(tracks)} subtitle tracks.")
            logger.info(f"Summary saved to: {summary_file}")
            logger.info(f"Detailed log saved to: {log_file}")
            
            # Print the temporary directory path and results
            print(f"TEMP_DIR:{temp_dir}")
            print(f"RESULTS:{json.dumps(extraction_results)}")
            
        except Exception as e:
            logger.error(f"\nAn unexpected error occurred: {e}")
            raise
    except Exception as e:
        logger.error(f"Error during subtitle extraction: {e}")
        # Clean up the temporary directory in case of error
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise

if __name__ == "__main__":
    main() 