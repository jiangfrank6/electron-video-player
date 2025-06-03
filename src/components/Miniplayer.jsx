import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Play, Pause } from 'lucide-react';

const Miniplayer = ({
  videoSrc,
  initialTime,
  isPlaying,
  onClose,
  onTimeUpdate,
  onPlayStateChange,
}) => {
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);
  const lastSyncedTime = useRef(0);

  // Handle initial time and play state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = initialTime;
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      }
    }
  }, [initialTime, isPlaying]);

  // Set up time sync with main window
  useEffect(() => {
    const { ipcRenderer } = window.require('electron');

    // Listen for time updates from main window
    const handleTimeSync = (event, { time }) => {
      if (videoRef.current && Math.abs(videoRef.current.currentTime - time) > 0.5) {
        videoRef.current.currentTime = time;
      }
    };

    ipcRenderer.on('sync-time', handleTimeSync);

    // Send time updates to main window
    const syncInterval = setInterval(() => {
      if (videoRef.current) {
        const currentTime = videoRef.current.currentTime;
        if (Math.abs(currentTime - lastSyncedTime.current) > 0.5) {
          ipcRenderer.send('miniplayer-time-update', {
            time: currentTime,
            isPlaying: !videoRef.current.paused
          });
          lastSyncedTime.current = currentTime;
        }
      }
    }, 1000);

    return () => {
      clearInterval(syncInterval);
      ipcRenderer.removeListener('sync-time', handleTimeSync);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        onPlayStateChange(true);
      } else {
        videoRef.current.pause();
        onPlayStateChange(false);
      }
    }
  };

  return (
    <div 
      className="relative w-full h-full bg-black"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {videoSrc ? (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain cursor-pointer"
            autoPlay={isPlaying}
            onClick={togglePlay}
            onTimeUpdate={(e) => onTimeUpdate(e.target.currentTime)}
            onPlay={() => onPlayStateChange(true)}
            onPause={() => onPlayStateChange(false)}
          />
          
          {/* Controls Overlay */}
          <div 
            className={`absolute inset-0 bg-gradient-to-t from-black/50 to-transparent transition-opacity duration-200 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={togglePlay}
          >
            {/* Center Play/Pause Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button 
                className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No video selected</p>
        </div>
      )}
    </div>
  );
};

Miniplayer.propTypes = {
  videoSrc: PropTypes.string.isRequired,
  initialTime: PropTypes.number.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onTimeUpdate: PropTypes.func.isRequired,
  onPlayStateChange: PropTypes.func.isRequired,
};

export default Miniplayer; 