import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, Settings, MinimizeIcon, X, ArrowLeft } from 'lucide-react';

const VideoPlayer = () => {
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [videoSrc, setVideoSrc] = useState('');
  const [isMiniplayer, setIsMiniplayer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [windowStartSize, setWindowStartSize] = useState({ width: 0, height: 0 });
  const [videoAspectRatio, setVideoAspectRatio] = useState(16/9); // default to 16:9
  const [videoQueue, setVideoQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  // Sample video URL (using relative URL from public directory)
  const sampleVideo = '/videoplayback.mp4';

  // Theme configuration
  const theme = {
    bg: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-950 via-gray-900 to-black',
    card: 'bg-gradient-to-br from-gray-800/20 to-gray-900/20',
    title: 'bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent',
    button: 'bg-gradient-to-r from-gray-700/80 to-gray-800/80 hover:from-gray-600/90 hover:to-gray-700/90',
    progress: 'bg-gradient-to-r from-white to-gray-300',
    overlay: 'bg-gradient-to-t from-black/30 to-transparent',
    miniplayerOverlay: 'bg-gradient-to-t from-black/30 to-transparent',
    playerBg: 'bg-black'
  };

  const videoContainerStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    cursor: isMiniplayer ? 'grab' : 'default',
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', () => setIsPlaying(false));

    // Add keyboard controls
    const handleKeyPress = (e) => {
      // For miniplayer, only handle events if it's focused
      // For main window, only handle events if miniplayer doesn't exist
      const { ipcRenderer } = window.require('electron');
      
      if (isMiniplayer) {
        // In miniplayer, only handle events if we're focused
        if (!document.hasFocus()) return;
      } else {
        // In main window, check if miniplayer exists
        const miniplayerExists = ipcRenderer.sendSync('check-miniplayer-exists');
        if (miniplayerExists) return;
      }

      switch(e.key) {
        case 'ArrowLeft':
          skip(-5);
          break;
        case 'ArrowRight':
          skip(5);
          break;
        case 'ArrowUp':
          const newVolume = Math.min(1, volume + 0.1);
          setVolume(newVolume);
          video.volume = newVolume;
          setIsMuted(false);
          break;
        case 'ArrowDown':
          const lowerVolume = Math.max(0, volume - 0.1);
          setVolume(lowerVolume);
          video.volume = lowerVolume;
          setIsMuted(lowerVolume === 0);
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
        case 'F':
          if (!isMiniplayer) {
            toggleFullscreen();
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'Escape':
          if (isMiniplayer) {
            e.preventDefault();
            toggleMiniplayer();
          }
          break;
        case 'PageUp':
          playPreviousVideo();
          break;
        case 'PageDown':
          playNextVideo();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', () => setIsPlaying(false));
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [videoSrc, volume, isPlaying, isMuted, isMiniplayer, currentQueueIndex, videoQueue]);

  // Add listener for time updates from miniplayer
  useEffect(() => {
    if (!isMiniplayer) {
      const { ipcRenderer } = window.require('electron');
      const handleTimeUpdate = (event, { time }) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      };
      const handlePlayState = (event, { isPlaying }) => {
        if (videoRef.current) {
          if (isPlaying) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
          setIsPlaying(isPlaying);
        }
      };

      ipcRenderer.on('miniplayer-time-update', handleTimeUpdate);
      ipcRenderer.on('miniplayer-play-state', handlePlayState);

      return () => {
        ipcRenderer.removeListener('miniplayer-time-update', handleTimeUpdate);
        ipcRenderer.removeListener('miniplayer-play-state', handlePlayState);
      };
    }
  }, [isMiniplayer]);

  // Check if we're in miniplayer mode on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isMiniplayer = params.get('miniplayer') === 'true';
    const startTime = params.get('time');
    const urlVideoSrc = params.get('videoSrc');
    const shouldPlay = params.get('isPlaying') === 'true';
    
    setIsMiniplayer(isMiniplayer);
    
    if (isMiniplayer && urlVideoSrc) {
      setVideoSrc(decodeURIComponent(urlVideoSrc));
      
      const { ipcRenderer } = window.require('electron');

      // Handle time sync from main window
      ipcRenderer.on('sync-time', (event, { time }) => {
        if (videoRef.current && Math.abs(videoRef.current.currentTime - time) > 0.5) {
          videoRef.current.currentTime = time;
        }
      });

      // Send state back to main window before closing
      const handleBeforeUnload = () => {
        if (videoRef.current) {
          ipcRenderer.send('miniplayer-closing', {
            time: videoRef.current.currentTime,
            isPlaying: !videoRef.current.paused
          });
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      const handleVideoLoad = () => {
        if (videoRef.current) {
          if (startTime) {
            videoRef.current.currentTime = parseFloat(startTime);
          }
          if (shouldPlay) {
            videoRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(console.error);
          }
        }
      };

      if (videoRef.current) {
        videoRef.current.addEventListener('loadeddata', handleVideoLoad);
      }

      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', handleVideoLoad);
        }
        window.removeEventListener('beforeunload', handleBeforeUnload);
        ipcRenderer.removeAllListeners('sync-time');
      };
    } else if (!isMiniplayer) {
      // Main window: handle state updates from miniplayer
      const { ipcRenderer } = window.require('electron');
      
      ipcRenderer.on('update-from-miniplayer', (event, { time, isPlaying }) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
          if (isPlaying) {
            videoRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(console.error);
          }
        }
      });

      // Main window: only sync time occasionally
      let lastSyncedTime = 0;
      const syncInterval = setInterval(() => {
        if (videoRef.current) {
          const currentTime = videoRef.current.currentTime;
          if (Math.abs(currentTime - lastSyncedTime) > 0.5) {
            ipcRenderer.send('sync-time', { time: currentTime });
            lastSyncedTime = currentTime;
          }
        }
      }, 1000);

      return () => {
        clearInterval(syncInterval);
        ipcRenderer.removeAllListeners('update-from-miniplayer');
      };
    }
  }, [isMiniplayer]);

  // Sync time between players
  useEffect(() => {
    if (!videoRef.current) return;

    const handleTimeUpdate = () => {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('update-time', videoRef.current.currentTime);
    };

    videoRef.current.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      videoRef.current.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isMiniplayer]);

  useEffect(() => {
    if (!isMiniplayer) {
      // Main player: Listen for state updates from miniplayer
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.on('update-player-state', (event, { time, isPlaying }) => {
        if (videoRef.current && Math.abs(videoRef.current.currentTime - time) > 0.5) {
          videoRef.current.currentTime = time;
        }
        if (isPlaying) {
          videoRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error('Error auto-playing video:', error);
          });
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      });

      return () => {
        ipcRenderer.removeAllListeners('update-player-state');
      };
    }
  }, [isMiniplayer]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const rect = volumeRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(1, clickX / rect.width));
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      // When unmuting, restore the previous volume if it exists, otherwise use 0.5
      const previousVolume = volume > 0 ? volume : 0.5;
      video.volume = previousVolume;
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      // When muting, keep track of current volume but set video volume to 0
      const currentVolume = video.volume;
      video.volume = 0;
      if (currentVolume > 0) {
        setVolume(currentVolume); // Store the current volume for later
      }
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setShowControls(true); // Show controls when entering fullscreen
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changePlaybackRate = (rate) => {
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const loadSampleVideo = () => {
    console.log('Attempting to load sample video:', sampleVideo);
    setVideoSrc(sampleVideo);
    setVideoQueue([{
      name: 'Sample Video',
      path: sampleVideo,
      file: null
    }]);
    setCurrentQueueIndex(0);
  };

  // Add video element error handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = (e) => {
      console.error('Video element error:', e);
      if (video.error) {
        console.error('Video error code:', video.error.code);
        console.error('Video error message:', video.error.message);
      }
      // Reset video source on error
      setVideoSrc('');
    };

    const handleLoadedData = () => {
      console.log('Video loaded successfully:', video.src);
    };

    video.addEventListener('error', handleError);
    video.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);

  // Debug video source changes
  useEffect(() => {
    console.log('Video source changed:', videoSrc);
  }, [videoSrc]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newVideos = files.map(file => ({
        name: file.name,
        path: URL.createObjectURL(file),
        file
      }));
      setVideoQueue([...videoQueue, ...newVideos]);
      if (!videoSrc) {
        setVideoSrc(newVideos[0].path);
        setCurrentQueueIndex(videoQueue.length);
      }
    }
  };

  const handleVideoSelect = (video) => {
    const index = videoQueue.findIndex(v => v.path === video.path);
    if (index !== -1) {
      setCurrentQueueIndex(index);
      setVideoSrc(video.path);
    }
  };

  const playNextVideo = () => {
    if (currentQueueIndex < videoQueue.length - 1) {
      const nextIndex = currentQueueIndex + 1;
      setCurrentQueueIndex(nextIndex);
      setVideoSrc(videoQueue[nextIndex].path);
    }
  };

  const playPreviousVideo = () => {
    if (currentQueueIndex > 0) {
      const prevIndex = currentQueueIndex - 1;
      setCurrentQueueIndex(prevIndex);
      setVideoSrc(videoQueue[prevIndex].path);
    }
  };

  // Add video ended handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoEnded = () => {
      if (currentQueueIndex < videoQueue.length - 1) {
        playNextVideo();
      }
    };

    video.addEventListener('ended', handleVideoEnded);
    return () => video.removeEventListener('ended', handleVideoEnded);
  }, [currentQueueIndex, videoQueue]);

  const toggleMiniplayer = () => {
    const { ipcRenderer } = window.require('electron');
    if (videoRef.current) {
      const wasPlaying = !videoRef.current.paused;
      if (!isMiniplayer) {
        // Exit fullscreen if active before opening miniplayer
        if (document.fullscreenElement) {
          document.exitFullscreen().then(() => {
            setIsFullscreen(false);
          }).catch(console.error);
        }
        
        videoRef.current.pause();
        setIsPlaying(false);
        // Get screen dimensions and set initial position
        ipcRenderer.invoke('get-screen-dimensions').then((dimensions) => {
          if (Array.isArray(dimensions)) {
            const [width, height] = dimensions;
            // Position in top right with 20px padding from edges
            const x = width - 320 - 20; // 320px is miniplayer width
            const y = 20; // 20px from top
            ipcRenderer.send('toggle-miniplayer', {
              videoTime: videoRef.current.currentTime,
              videoSrc: videoSrc,
              isPlaying: wasPlaying,
              position: { x, y }
            });
          }
        }).catch(error => {
          console.error('Error getting screen dimensions:', error);
          // Fallback: just send without position
          ipcRenderer.send('toggle-miniplayer', {
            videoTime: videoRef.current.currentTime,
            videoSrc: videoSrc,
            isPlaying: wasPlaying
          });
        });
      } else {
        ipcRenderer.send('toggle-miniplayer', {
          videoTime: videoRef.current.currentTime,
          videoSrc: videoSrc,
          isPlaying: wasPlaying
        });
      }
    }
  };

  // Add mouse event handlers for dragging
  const handleMouseDown = (e) => {
    if (!isMiniplayer) return;
    setIsDragging(true);
    
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.invoke('get-window-position').then((position) => {
      if (!Array.isArray(position)) return;
      setDragStartPos({
        mouseX: e.screenX,
        mouseY: e.screenY,
        windowX: position[0],
        windowY: position[1]
      });
    }).catch(console.error);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !isMiniplayer) return;
    const { ipcRenderer } = window.require('electron');
    const deltaX = e.screenX - dragStartPos.mouseX;
    const deltaY = e.screenY - dragStartPos.mouseY;
    const newX = Math.round(dragStartPos.windowX + deltaX);
    const newY = Math.round(dragStartPos.windowY + deltaY);
    ipcRenderer.send('set-miniplayer-position', { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isMiniplayer) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isMiniplayer, isDragging, dragStartPos]);

  // Add fullscreen change event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleBackToMenu = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setVideoSrc('');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  // Add video metadata handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      setVideoAspectRatio(aspectRatio);
      
      // Send aspect ratio to main process
      if (isMiniplayer) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('update-aspect-ratio', { aspectRatio });
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [videoSrc, isMiniplayer]);

  // Add resize handlers
  const handleResizeStart = (e) => {
    if (!isMiniplayer) return;
    e.stopPropagation(); // Prevent dragging when resizing
    setIsResizing(true);
    
    const { ipcRenderer } = window.require('electron');
    Promise.all([
      ipcRenderer.invoke('get-window-size'),
      ipcRenderer.invoke('get-window-position'),
      ipcRenderer.invoke('get-screen-dimensions')
    ]).then(([size, position, screenDims]) => {
      setWindowStartSize(size);
      setResizeStartPos({
        x: e.screenX,
        y: e.screenY,
        windowX: position[0],
        windowY: position[1],
        screenWidth: screenDims[0],
        screenHeight: screenDims[1]
      });
    }).catch(console.error);
  };

  const handleResizeMove = (e) => {
    if (!isResizing || !isMiniplayer) return;
    e.stopPropagation();
    
    // Calculate the intended cursor position, even if it's beyond screen bounds
    let effectiveX = e.screenX;
    let effectiveY = e.screenY;

    // If cursor is at screen edge, extrapolate the intended position
    if (e.screenX >= resizeStartPos.screenWidth - 1) {
      const overflowRatio = (e.screenX - resizeStartPos.x) / (resizeStartPos.screenWidth - resizeStartPos.x);
      effectiveX = resizeStartPos.x + (resizeStartPos.screenWidth - resizeStartPos.x) * Math.max(1, overflowRatio);
    }
    if (e.screenY >= resizeStartPos.screenHeight - 1) {
      const overflowRatio = (e.screenY - resizeStartPos.y) / (resizeStartPos.screenHeight - resizeStartPos.y);
      effectiveY = resizeStartPos.y + (resizeStartPos.screenHeight - resizeStartPos.y) * Math.max(1, overflowRatio);
    }

    const deltaX = effectiveX - resizeStartPos.x;
    const deltaY = effectiveY - resizeStartPos.y;
    
    const { ipcRenderer } = window.require('electron');
    
    // Calculate diagonal distance ratio using effective coordinates
    const startDiagonal = Math.sqrt(
      windowStartSize.width * windowStartSize.width + 
      windowStartSize.height * windowStartSize.height
    );
    const currentDiagonal = Math.sqrt(
      (windowStartSize.width + deltaX) * (windowStartSize.width + deltaX) + 
      (windowStartSize.height + deltaY) * (windowStartSize.height + deltaY)
    );
    const scale = currentDiagonal / startDiagonal;
    
    // Apply scale while maintaining aspect ratio
    const newWidth = Math.round(windowStartSize.width * scale);
    const newHeight = Math.round(windowStartSize.height * scale);
    
    ipcRenderer.send('resize-miniplayer', { width: newWidth, height: newHeight });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isMiniplayer) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isMiniplayer, isResizing, resizeStartPos, windowStartSize, videoAspectRatio]);

  // Add resize cursor style
  const resizeStyle = isMiniplayer ? {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '12px',
    height: '12px',
    cursor: 'se-resize'
  } : {};

  // Add port detection and communication with main process
  useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    const port = window.location.port;
    if (port) {
      ipcRenderer.send('update-dev-server-port', parseInt(port, 10));
    }
  }, []);

  return (
    <div className={`${isMiniplayer ? '' : 'min-h-screen'} bg-[#0a0b0e] text-white`}>
      {isMiniplayer ? (
        // Miniplayer view - only show video and minimal controls
        <div 
          ref={containerRef}
          className="relative w-full h-full"
          style={videoContainerStyle}
          onMouseDown={handleMouseDown}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            onClick={togglePlay}
          />
          {/* Miniplayer Controls */}
          <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} z-30`}>
            <div className={`absolute inset-0 ${theme.miniplayerOverlay}`} />
            
            {/* Close button */}
            <button
              onClick={toggleMiniplayer}
              className={`absolute top-2 right-2 p-1.5 ${theme.button} backdrop-blur-xl rounded-full z-10 opacity-90 hover:opacity-100 transition-all duration-200`}
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="absolute inset-0 flex items-center justify-center gap-4">
              <button
                onClick={() => skip(-5)}
                className={`p-2 ${theme.button} backdrop-blur-xl rounded-full opacity-90 hover:opacity-100 transition-all duration-200`}
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={togglePlay}
                className={`p-4 ${theme.button} backdrop-blur-xl rounded-full opacity-90 hover:opacity-100 transition-all duration-200`}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </button>

              <button
                onClick={() => skip(5)}
                className={`p-2 ${theme.button} backdrop-blur-xl rounded-full opacity-90 hover:opacity-100 transition-all duration-200`}
              >
                <RotateCw className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Resize handle */}
          <div
            style={resizeStyle}
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
          />
        </div>
      ) : (
        // Main window view - show full interface
        <div className="flex h-screen">
          {/* Left side - Video Queue */}
          <div className="w-[400px] bg-[#13141a] border-r border-gray-800 flex flex-col">
            <div className="p-6">
              <h1 className="text-3xl font-bold mb-6">Video Queue</h1>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search videos..."
                  className="w-full bg-[#1e1f25] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Keyboard shortcuts */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400 mb-6">
                <div>Space: Play/Pause</div>
                <div>←/→: Skip 5s</div>
                <div>↑/↓: Volume</div>
                <div>M: Mute</div>
                <div>F: Fullscreen</div>
              </div>
            </div>

            {/* Video list */}
            <div className="flex-1 overflow-y-auto px-4">
              {videoQueue.map((video, index) => (
                <div
                  key={video.path}
                  className={`flex items-center p-4 mb-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentQueueIndex === index
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-[#1e1f25] hover:bg-[#25262b]'
                  }`}
                  onClick={() => handleVideoSelect(video)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate mb-1">
                      {video.name || 'Sample Video'}
                    </div>
                    <div className="text-gray-400 text-sm truncate">
                      {video.path.split('/').pop()}
                    </div>
                  </div>
                  {currentQueueIndex === index && (
                    <Play className="w-5 h-5 text-white ml-3 flex-shrink-0" />
                  )}
                </div>
              ))}

              {!videoSrc && (
                <div className="p-4 bg-[#1e1f25] rounded-lg">
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={loadSampleVideo}
                      className="flex items-center justify-between w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200"
                    >
                      <div>
                        <div className="font-medium">Sample Video</div>
                        <div className="text-sm text-blue-200">videoplayback.mp4</div>
                      </div>
                      <Play className="w-5 h-5" />
                    </button>
                    <label className="flex items-center justify-center w-full p-3 bg-[#25262b] hover:bg-[#2c2d31] rounded-lg cursor-pointer transition-all duration-200">
                      Upload Video Files
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Video Player */}
          <div className="flex-1 flex flex-col bg-black">
            {videoSrc ? (
              <>
                {/* Video Container */}
                <div 
                  ref={containerRef}
                  className="relative flex-1"
                >
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    className="w-full h-full object-contain"
                    onClick={togglePlay}
                  />
                  {/* Controls overlay */}
                  <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} z-30`}>
                    {/* Play/Pause Center Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={togglePlay}
                        className="p-4 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all duration-200"
                      >
                        {isPlaying ? (
                          <Pause className="w-8 h-8 text-white" />
                        ) : (
                          <Play className="w-8 h-8 text-white ml-1" />
                        )}
                      </button>
                    </div>

                    {/* Bottom Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {/* Progress Bar */}
                      <div
                        ref={progressRef}
                        className="w-full h-2 bg-white/20 rounded-full mb-4 cursor-pointer hover:bg-white/30 transition-colors"
                        onClick={handleProgressClick}
                      >
                        <div
                          className={`h-full ${theme.progress} rounded-full relative`}
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        >
                          <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"></div>
                        </div>
                      </div>

                      {/* Control Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={togglePlay}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                          >
                            {isPlaying ? (
                              <Pause className="w-5 h-5 text-white" />
                            ) : (
                              <Play className="w-5 h-5 text-white" />
                            )}
                          </button>

                          <button
                            onClick={() => skip(-5)}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <RotateCcw className="w-5 h-5 text-white" />
                          </button>

                          <button
                            onClick={() => skip(5)}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <RotateCw className="w-5 h-5 text-white" />
                          </button>

                          {/* Volume Control */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={toggleMute}
                              className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                              {isMuted ? (
                                <VolumeX className="w-5 h-5 text-white" />
                              ) : (
                                <Volume2 className="w-5 h-5 text-white" />
                              )}
                            </button>
                            <div
                              ref={volumeRef}
                              className="w-20 h-2 bg-white/20 rounded-full cursor-pointer"
                              onClick={handleVolumeChange}
                            >
                              <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Time Display */}
                          <div className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Settings Button */}
                          <div className="relative">
                            <button
                              onClick={() => setShowSettings(!showSettings)}
                              className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                              <Settings className="w-5 h-5 text-white" />
                            </button>

                            {/* Settings Menu */}
                            {showSettings && (
                              <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 shadow-lg">
                                <div className="p-2">
                                  <div className="text-white text-sm font-medium mb-2">Playback Speed</div>
                                  {[0.5, 1, 1.5, 2].map((rate) => (
                                    <button
                                      key={rate}
                                      onClick={() => changePlaybackRate(rate)}
                                      className={`w-full text-left px-3 py-1 text-sm ${
                                        playbackRate === rate ? 'text-blue-400' : 'text-white'
                                      } hover:bg-white/10`}
                                    >
                                      {rate}x
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Miniplayer Button */}
                          <button
                            onClick={toggleMiniplayer}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            title="Miniplayer"
                          >
                            <MinimizeIcon className="w-5 h-5 text-white" />
                          </button>

                          {/* Fullscreen Button */}
                          <button
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <Maximize className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-500 text-lg">
                  Select a video to start playing
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer; 