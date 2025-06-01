import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, Settings } from 'lucide-react';

const VideoPlayer = () => {
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [videoSrc, setVideoSrc] = useState('');
  const [currentTheme, setCurrentTheme] = useState('ocean');

  // Sample video URL (you can replace with your own)
  const sampleVideo = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  // Theme configurations
  const themes = {
    ocean: {
      name: 'Ocean Blue',
      bg: 'bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900',
      card: 'bg-slate-800/50',
      title: 'bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent',
      button: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
      progress: 'bg-gradient-to-r from-blue-500 to-cyan-500'
    },
    monochrome: {
      name: 'Monochrome',
      bg: 'bg-gradient-to-br from-gray-900 via-gray-800 to-black',
      card: 'bg-gray-800/50',
      title: 'bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent',
      button: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800',
      progress: 'bg-gradient-to-r from-gray-400 to-gray-500'
    }
  };

  const theme = themes[currentTheme];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [videoSrc]);

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
    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = videoRef.current.parentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
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

  return (
    <div className={`min-h-screen ${theme.bg} p-4`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-4xl font-bold ${theme.title}`}>
            Custom Video Player
          </h1>
          
          {/* Theme Selector */}
          <div className="relative">
            <select
              value={currentTheme}
              onChange={(e) => setCurrentTheme(e.target.value)}
              className="bg-gray-800/70 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(themes).map(([key, theme]) => (
                <option key={key} value={key} className="bg-gray-800">
                  {theme.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {!videoSrc && (
          <div className={`${theme.card} backdrop-blur-sm rounded-xl p-8 mb-8 border border-gray-700`}>
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
            className="relative bg-black rounded-xl overflow-hidden shadow-2xl group"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full aspect-video"
              onClick={togglePlay}
            />
            
            {/* Controls Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              
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
                      onClick={() => skip(-10)}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <RotateCcw className="w-5 h-5 text-white" />
                    </button>

                    <button
                      onClick={() => skip(10)}
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
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 rounded-lg shadow-lg">
                          <div className="p-2">
                            <div className="text-white text-sm font-medium mb-2">Playback Speed</div>
                            {[0.5, 1, 1.5, 2].map((rate) => (
                              <button
                                key={rate}
                                onClick={() => changePlaybackRate(rate)}
                                className={`w-full text-left px-3 py-1 text-sm ${
                                  playbackRate === rate ? 'text-blue-400' : 'text-white'
                                } hover:bg-white/10 rounded`}
                              >
                                {rate}x
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

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
        )}
      </div>
    </div>
  );
};

export default VideoPlayer; 