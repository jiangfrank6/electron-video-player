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

  // Sample video URL (you can replace with your own)
  const sampleVideo = './videoplayback.mp4';

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
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', () => setIsPlaying(false));
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [videoSrc, volume, isPlaying, isMuted, isMiniplayer]);

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
    setVideoSrc(sampleVideo);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

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

  return (
    <div className={`${isMiniplayer ? 'h-screen' : 'min-h-screen'} ${theme.bg} ${isMiniplayer ? 'p-0' : 'p-4'}`}>
      <div 
        ref={containerRef}
        className={`${isMiniplayer ? 'w-full h-full bg-black' : 'max-w-6xl mx-auto'} relative ${isFullscreen ? 'fixed inset-0 bg-black z-50' : ''}`}
        style={videoContainerStyle}
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (isMiniplayer) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('focus-miniplayer');
          }
        }}
      >
        {!isMiniplayer && !isFullscreen && (
          <div className="flex items-center justify-between mb-8">
            <h1 className={`text-4xl font-bold ${theme.title}`}>
              Custom Video Player
            </h1>
            {videoSrc && (
              <button
                onClick={handleBackToMenu}
                className={`px-4 py-2 ${theme.button} text-white rounded-lg transition-all duration-200 font-medium flex items-center gap-2`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Menu
              </button>
            )}
          </div>
        )}
        
        {!videoSrc && !isMiniplayer && !isFullscreen && (
          <div className={`${theme.card} p-8 mb-8 border border-gray-800/20`}>
            <h2 className="text-xl font-semibold text-white mb-4">Load a Video</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={loadSampleVideo}
                className={`px-6 py-3 ${theme.button} text-white rounded-lg transition-all duration-200 font-medium`}
              >
                Load Sample Video
              </button>
              <label className={`px-6 py-3 ${theme.button} text-white rounded-lg transition-all duration-200 font-medium cursor-pointer text-center`}>
                Upload Video File
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {videoSrc && (
          <div 
            className={`relative overflow-hidden group ${isMiniplayer ? 'w-full h-full' : ''} ${isFullscreen ? 'fixed inset-0 w-screen h-screen bg-black' : ''}`}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => !isFullscreen && setShowControls(false)}
          >
            {/* Video Container */}
            <div className={`relative ${isFullscreen ? 'w-screen h-screen' : 'w-full h-full'}`}>
              <video
                ref={videoRef}
                src={videoSrc}
                className={`${
                  isMiniplayer || isFullscreen
                    ? 'w-full h-full object-contain'
                    : 'w-full aspect-video'
                }`}
                onClick={togglePlay}
              />
            </div>
            
            {/* Controls Overlay */}
            <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'} z-30`}>
              {/* Only show gradient overlay for miniplayer */}
              {isMiniplayer && (
                <div className={`absolute inset-0 ${theme.miniplayerOverlay}`} />
              )}
              
              {isMiniplayer ? (
                // Miniplayer Controls
                <>
                  {/* Close button with theme-aware styling */}
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
                </>
              ) : (
                // Main player controls - Keep existing controls
                <>
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
                        {!isMiniplayer && (
                          <button
                            onClick={toggleMiniplayer}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            title="Miniplayer"
                          >
                            <MinimizeIcon className="w-5 h-5 text-white" />
                          </button>
                        )}

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
                </>
              )}
            </div>
          </div>
        )}

        {!isMiniplayer && !isFullscreen && videoSrc && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-300 mt-4">
            <div><strong>Space:</strong> Play/Pause</div>
            <div><strong>←/→:</strong> Skip 5s</div>
            <div><strong>↑/↓:</strong> Volume</div>
            <div><strong>M:</strong> Mute</div>
            <div><strong>F:</strong> Fullscreen</div>
          </div>
        )}

        {isMiniplayer && (
          <div
            style={resizeStyle}
            onMouseDown={handleResizeStart}
          />
        )}
      </div>
    </div>
  );
};

export default VideoPlayer; 