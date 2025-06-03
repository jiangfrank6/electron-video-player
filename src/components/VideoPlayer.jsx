import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, Settings, MinimizeIcon, X, ArrowLeft, SkipBack, SkipForward, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ProgressBar from './ProgressBar';

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
  const [autoplay, setAutoplay] = useState(true);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTimeTooltip, setShowTimeTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [tooltipTime, setTooltipTime] = useState(0);
  const progressBarRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const [isHoveringControls, setIsHoveringControls] = useState(false);

  // Sample videos
  const sampleVideos = [
    {
      name: 'Sample Video 1',
      path: '/videoplayback.mp4'
    },
    {
      name: 'Sample Video 2',
      path: '/videoplayback2.mp4'
    },
    {
      name: 'Sample Video 3',
      path: '/videoplayback3.mp4'
    }
  ];

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
        case 'i':
        case 'I':
          e.preventDefault();
          toggleMiniplayer();
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

  // Handle progress bar interactions
  const handleProgressMouseDown = (e) => {
    e.preventDefault(); // Prevent text selection while dragging
    setIsDraggingProgress(true);
    updateVideoProgress(e);
    
    const handleMouseMove = (e) => {
      if (isDraggingProgress) {
        updateVideoProgress(e);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingProgress(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const updateVideoProgress = (e) => {
    if (!progressBarRef.current || !videoRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = clickX / rect.width;
    const newTime = percentage * videoRef.current.duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percentage * 100);

    // Keep controls visible while dragging
    setShowControls(true);
  };

  // Handle progress bar hover for time tooltip
  const handleProgressBarHover = (e) => {
    if (!progressBarRef.current || !videoRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const hoverX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = hoverX / rect.width;
    const previewTime = percentage * videoRef.current.duration;
    
    setTooltipTime(previewTime);
    setTooltipPosition(hoverX);
    setShowTimeTooltip(true);
  };

  // Update progress bar position
  useEffect(() => {
    if (videoRef.current && duration > 0 && !isDraggingProgress) {
      const progress = (currentTime / duration) * 100;
      setProgress(progress);
    }
  }, [currentTime, duration, isDraggingProgress]);

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

  const loadSampleVideo = (video) => {
    console.log('Loading sample video:', video.path);
    setVideoSrc(video.path);
    setVideoQueue([{
      name: video.name,
      path: video.path,
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
      const newVideos = files.map(file => {
        // Check if the file is an MKV
        const isMkv = file.name.toLowerCase().endsWith('.mkv');
        
        // Create object URL for the video
        const videoUrl = URL.createObjectURL(file);
        
        // Check if the video format is supported
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          if (video.videoWidth === 0) {
            console.error(`Unsupported video format: ${file.name}`);
            // Clean up the object URL
            URL.revokeObjectURL(videoUrl);
            // Remove the video from queue if it's already added
            setVideoQueue(prev => prev.filter(v => v.path !== videoUrl));
            // Show error to user
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('show-error', {
              title: 'Unsupported Format',
              message: `The video format of "${file.name}" is not supported by your browser. You may need to convert it to a supported format.`
            });
          }
        };
        video.src = videoUrl;

        return {
          name: file.name,
          path: videoUrl,
          file,
          type: isMkv ? 'video/x-matroska' : file.type
        };
      });

      setVideoQueue([...videoQueue, ...newVideos]);
      if (!videoSrc) {
        setVideoSrc(newVideos[0].path);
        setCurrentQueueIndex(videoQueue.length);
      }
    }
  };

  const removeFromQueue = (indexToRemove) => {
    // If removing currently playing video
    if (indexToRemove === currentQueueIndex) {
      if (videoQueue.length === 1) {
        // If it's the last video, clear everything
        setVideoSrc('');
        setCurrentQueueIndex(0);
        setVideoQueue([]);
      } else if (indexToRemove === videoQueue.length - 1) {
        // If removing last video in queue, go to previous video
        const newIndex = indexToRemove - 1;
        setCurrentQueueIndex(newIndex);
        setVideoSrc(videoQueue[newIndex].path);
      } else {
        // If removing current video but not last, play next video
        setVideoSrc(videoQueue[indexToRemove + 1].path);
      }
    } else if (indexToRemove < currentQueueIndex) {
      // If removing video before current, adjust current index
      setCurrentQueueIndex(currentQueueIndex - 1);
    }

    // Update queue
    setVideoQueue(prev => prev.filter((_, index) => index !== indexToRemove));

    // Clean up object URL if it exists
    if (videoQueue[indexToRemove]?.file) {
      URL.revokeObjectURL(videoQueue[indexToRemove].path);
    }
  };

  const handleVideoSelect = (video) => {
    const index = videoQueue.findIndex(v => v.path === video.path);
    if (index !== -1) {
      setCurrentQueueIndex(index);
      setVideoSrc(video.path);
      // Start playing the selected video
      if (videoRef.current) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error('Error auto-playing selected video:', error);
        });
      }
    }
  };

  const playNextVideo = () => {
    if (currentQueueIndex < videoQueue.length - 1) {
      const nextIndex = currentQueueIndex + 1;
      setCurrentQueueIndex(nextIndex);
      setVideoSrc(videoQueue[nextIndex].path);
      
      // Add a small delay to ensure the video source has been updated
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error('Error auto-playing next video:', error);
          });
        }
      }, 100);
    }
  };

  const playPreviousVideo = () => {
    if (currentQueueIndex > 0) {
      const prevIndex = currentQueueIndex - 1;
      setCurrentQueueIndex(prevIndex);
      setVideoSrc(videoQueue[prevIndex].path);
      // Start playing the previous video
      if (videoRef.current) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error('Error auto-playing previous video:', error);
        });
      }
    }
  };

  // Update video ended handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoEnded = () => {
      if (autoplay && currentQueueIndex < videoQueue.length - 1) {
        playNextVideo();
      }
    };

    video.addEventListener('ended', handleVideoEnded);
    return () => video.removeEventListener('ended', handleVideoEnded);
  }, [currentQueueIndex, videoQueue, autoplay]);

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

  const handleMouseMove = () => {
    setShowControls(true);
    
    // Clear any existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Set a new timeout to hide controls after 0.5 seconds of no movement
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettings && !isDraggingProgress && isPlaying && !isHoveringControls) {
        setShowControls(false);
      }
    }, 500);
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

  // Add effect to handle video source changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    const handleLoadedMetadata = () => {
      if (isPlaying) {
        video.play().then(() => {
          // Successfully started playing
        }).catch(error => {
          console.error('Error auto-playing video after metadata load:', error);
        });
      }
    };

    const handleLoadedData = () => {
      if (isPlaying) {
        video.play().then(() => {
          // Successfully started playing
        }).catch(error => {
          console.error('Error auto-playing video after data load:', error);
        });
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [videoSrc, isPlaying]);

  // Add debug logging for isPlaying state changes
  useEffect(() => {
    console.log('isPlaying state changed:', isPlaying);
  }, [isPlaying]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(videoQueue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update queue
    setVideoQueue(items);

    // Update currentQueueIndex to follow the currently playing video
    if (currentQueueIndex === result.source.index) {
      // If we're dragging the current video, update index to new position
      setCurrentQueueIndex(result.destination.index);
    } else if (
      // If we're dragging a video from before the current to after it
      currentQueueIndex > result.source.index && 
      currentQueueIndex <= result.destination.index
    ) {
      // Shift current index back by 1
      setCurrentQueueIndex(currentQueueIndex - 1);
    } else if (
      // If we're dragging a video from after the current to before it
      currentQueueIndex < result.source.index && 
      currentQueueIndex >= result.destination.index
    ) {
      // Shift current index forward by 1
      setCurrentQueueIndex(currentQueueIndex + 1);
    }
  };

  // Update hover tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = () => {
      setShowControls(true);
      setIsHoveringControls(false);
    };

    const handleMouseLeave = () => {
      setIsHoveringControls(false);
      if (isPlaying && !showSettings && !isDraggingProgress) {
        setShowControls(false);
      }
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isPlaying, showSettings, isDraggingProgress]);

  // Add time update handler
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);

    // If we're in miniplayer mode, send time updates to main window
    if (isMiniplayer) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('miniplayer-time-update', {
        time: videoRef.current.currentTime,
        isPlaying: !videoRef.current.paused
      });
    }
  };

  // Add loaded metadata handler
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    
    // Set video aspect ratio
    const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight;
    setVideoAspectRatio(aspectRatio);
    
    // If in miniplayer, send aspect ratio to main process
    if (isMiniplayer) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('update-aspect-ratio', { aspectRatio });
    }
  };

  // Add video ended handler
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (autoplay && currentQueueIndex < videoQueue.length - 1) {
      playNextVideo();
    }
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
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
        <DragDropContext onDragEnd={handleDragEnd} lockAxis="vertical">
          <div className="flex h-screen">
            {/* Left side - Video Queue */}
            <div className={`w-80 flex flex-col ${theme.bg}`}>
              <div className="p-4 border-b border-gray-800">
                <h2 className={`text-xl font-semibold ${theme.title}`}>Video Queue</h2>
              </div>
              <Droppable droppableId="video-queue" direction="vertical">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 overflow-y-auto p-4 ${
                      snapshot.isDraggingOver ? 'bg-gray-900/50' : ''
                    }`}
                  >
                    {/* Upload button - Always visible */}
                    <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-4 bg-[#0a0b0e]">
                      <label className="flex items-center justify-center w-full p-3 bg-[#25262b] hover:bg-[#2c2d31] rounded-lg cursor-pointer transition-all duration-200">
                        <span className="text-white">Add More Videos</span>
                        <input
                          type="file"
                          accept="video/*,.mkv"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Container for draggable content */}
                    <div className="mt-4">
                      {/* Sample videos section - only show if queue is empty */}
                      {videoQueue.length === 0 && (
                        <div className="flex flex-col gap-2">
                          {sampleVideos.map((video, index) => (
                            <div
                              key={video.path}
                              className="flex items-center h-[52px] p-3 bg-[#1e1f25] hover:bg-[#25262b] rounded-lg transition-all duration-200"
                            >
                              {/* Grip icon for visual consistency */}
                              <div className="mr-2">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                              </div>

                              {/* Video info */}
                              <div 
                                className="flex-1 min-w-0 mr-2 cursor-pointer"
                                onClick={() => loadSampleVideo(video)}
                              >
                                <div className="text-white font-medium truncate">
                                  {video.name}
                                </div>
                              </div>

                              {/* Play button */}
                              <button
                                onClick={() => loadSampleVideo(video)}
                                className="p-1.5 hover:bg-blue-500 rounded transition-colors"
                                title="Play video"
                              >
                                <Play className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Video queue items */}
                      {videoQueue.map((video, index) => (
                        <Draggable 
                          key={video.path} 
                          draggableId={video.path} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                transform: provided.draggableProps.style?.transform
                                  ? `translate(0px, ${provided.draggableProps.style.transform.split(',')[1]}`
                                  : 'translate(0px, 0px)'
                              }}
                              className={`flex items-center h-[52px] p-3 mb-2 rounded-lg transition-all duration-200 ${
                                snapshot.isDragging
                                  ? 'bg-blue-600 shadow-lg'
                                  : currentQueueIndex === index
                                  ? 'bg-[#2c2d31]'
                                  : 'bg-[#1e1f25] hover:bg-[#25262b]'
                              }`}
                            >
                              {/* Drag handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="mr-2 cursor-grab active:cursor-grabbing hover:text-gray-300"
                              >
                                <GripVertical className="w-4 h-4 text-gray-400" />
                              </div>

                              {/* Video info */}
                              <div 
                                className="flex-1 min-w-0 mr-2 cursor-pointer"
                                onClick={() => handleVideoSelect(video)}
                              >
                                <div className="text-white font-medium truncate">
                                  {video.name || video.path.split('/').pop()}
                                </div>
                              </div>

                              {/* Remove button */}
                              <button
                                onClick={() => removeFromQueue(index)}
                                className="p-1.5 hover:bg-red-500 rounded transition-colors"
                                title="Remove from queue"
                              >
                                <X className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            </div>

            {/* Right side - Video Player */}
            <div className="flex-1 flex flex-col bg-black">
              <div 
                ref={containerRef}
                className="relative flex-1"
                onMouseMove={handleMouseMove}
              >
                {videoSrc ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-contain"
                      src={videoSrc}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleVideoEnded}
                      onClick={togglePlay}
                    />
                    
                    {/* Center controls overlay */}
                    <div 
                      className={`absolute inset-0 flex items-center justify-center gap-8 transition-opacity duration-300 ${
                        showControls ? 'opacity-100' : 'opacity-0'
                      } ${showControls ? 'pointer-events-auto' : 'pointer-events-none'}`}
                    >
                      {/* Rewind 5s */}
                      <button
                        onClick={() => skip(-5)}
                        className="p-3 bg-black/40 hover:bg-black/60 rounded-full transition-all duration-200 group"
                      >
                        <RotateCcw className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                      </button>

                      {/* Play/Pause */}
                      <button
                        onClick={togglePlay}
                        className="p-6 bg-black/40 hover:bg-black/60 rounded-full transition-all duration-200 backdrop-blur-sm group"
                      >
                        {isPlaying ? (
                          <Pause className="w-12 h-12 text-white group-hover:scale-110 transition-transform" />
                        ) : (
                          <Play className="w-12 h-12 text-white group-hover:scale-110 transition-transform ml-1" />
                        )}
                      </button>

                      {/* Forward 5s */}
                      <button
                        onClick={() => skip(5)}
                        className="p-3 bg-black/40 hover:bg-black/60 rounded-full transition-all duration-200 backdrop-blur-sm group"
                      >
                        <RotateCw className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                      </button>
                    </div>

                    {/* Bottom controls */}
                    <div 
                      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
                        showControls ? 'opacity-100' : 'opacity-0'
                      } ${showControls ? 'pointer-events-auto' : 'pointer-events-none'}`}
                      onMouseEnter={() => setIsHoveringControls(true)}
                      onMouseLeave={() => setIsHoveringControls(false)}
                    >
                      <div className="flex flex-col space-y-2">
                        {/* Progress bar */}
                        <div className="relative">
                          <ProgressBar
                            currentTime={currentTime}
                            duration={duration}
                            onTimeUpdate={(time) => {
                              if (videoRef.current) {
                                if (isPlaying) {
                                  videoRef.current.pause();
                                }
                                videoRef.current.currentTime = time;
                                setCurrentTime(time);
                                if (isPlaying) {
                                  videoRef.current.play();
                                }
                              }
                            }}
                          />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between">
                          {/* Left side controls */}
                          <div className="flex items-center space-x-4">
                            {/* Previous video button */}
                            <button
                              onClick={playPreviousVideo}
                              className="p-2 hover:bg-white/20 rounded-full transition-colors"
                              disabled={currentQueueIndex === 0}
                            >
                              <SkipBack className={`w-5 h-5 ${currentQueueIndex === 0 ? 'text-gray-500' : 'text-white'}`} />
                            </button>

                            {/* Play/Pause button */}
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

                            {/* Next video button */}
                            <button
                              onClick={playNextVideo}
                              className="p-2 hover:bg-white/20 rounded-full transition-colors"
                              disabled={currentQueueIndex === videoQueue.length - 1}
                            >
                              <SkipForward className={`w-5 h-5 ${currentQueueIndex === videoQueue.length - 1 ? 'text-gray-500' : 'text-white'}`} />
                            </button>

                            {/* Volume control */}
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
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => {
                                  const newVolume = parseFloat(e.target.value);
                                  setVolume(newVolume);
                                  setIsMuted(newVolume === 0);
                                  if (videoRef.current) {
                                    videoRef.current.volume = newVolume;
                                  }
                                }}
                                className="w-20 accent-white"
                              />
                            </div>

                            {/* Time display */}
                            <div className="text-white text-sm">
                              {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                          </div>

                          {/* Right side controls */}
                          <div className="flex items-center space-x-4">
                            {/* Settings button */}
                            <div className="relative">
                              <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                              >
                                <Settings className="w-5 h-5 text-white" />
                              </button>

                              {/* Settings menu */}
                              {showSettings && (
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                                  <div className="p-2">
                                    {/* Autoplay toggle */}
                                    <div className="px-3 py-2 border-b border-gray-700">
                                      <div className="flex items-center justify-between">
                                        <span className="text-white text-sm">Autoplay</span>
                                        <button
                                          onClick={() => setAutoplay(!autoplay)}
                                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
                                            autoplay ? 'bg-blue-600' : 'bg-gray-600'
                                          }`}
                                        >
                                          <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                                              autoplay ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                          />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Playback speed */}
                                    <div className="px-3 py-2">
                                      <div className="text-white text-sm mb-2">Playback Speed</div>
                                      {[0.5, 1, 1.5, 2].map((rate) => (
                                        <button
                                          key={rate}
                                          onClick={() => changePlaybackRate(rate)}
                                          className={`w-full text-left px-3 py-1 text-sm rounded ${
                                            playbackRate === rate ? 'text-blue-400 bg-white/10' : 'text-white hover:bg-white/10'
                                          }`}
                                        >
                                          {rate}x
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Miniplayer button */}
                            <button
                              onClick={toggleMiniplayer}
                              className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                              <MinimizeIcon className="w-5 h-5 text-white" />
                            </button>

                            {/* Fullscreen button */}
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
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xl text-gray-400 mb-4">No video selected</p>
                      <p className="text-gray-500">Select a video from the queue to play</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DragDropContext>
      )}
    </div>
  );
};

export default VideoPlayer; 