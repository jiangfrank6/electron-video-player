import React from 'react';
import PropTypes from 'prop-types';
import { Maximize, MinimizeIcon, Subtitles } from 'lucide-react';
import TimeDisplay from './TimeDisplay';
import VolumeControl from './VolumeControl';
import PlaybackSettings from './PlaybackSettings';
import PlayPauseButton from './PlayPauseButton';
import SkipButton from './SkipButton';
import ProgressBar from './ProgressBar';
import FullscreenButton from './FullscreenButton';
import MiniplayerButton from './MiniplayerButton';

const VideoControls = ({
  showControls,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  autoplay,
  onPlayPauseClick,
  onVolumeChange,
  onToggleMute,
  onTimeUpdate,
  onSkipTime,
  onPlaybackRateChange,
  onAutoplayChange,
  onToggleMiniplayer,
  onToggleFullscreen,
  onNextVideo,
  onPreviousVideo,
  hasNext,
  hasPrevious,
  onMouseEnter,
  onMouseLeave,
  isMiniplayer = false,
  onSubtitleClick,
  hasSubtitles = false
}) => {
  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      } ${showControls ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex flex-col space-y-2">
        {/* Progress bar */}
        <div className="relative">
          <ProgressBar
            currentTime={currentTime}
            duration={duration}
            onTimeUpdate={onTimeUpdate}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Left side controls */}
          <div className="flex items-center space-x-4">
            {/* Previous video button */}
            {hasPrevious && (
              <SkipButton
                direction="backward"
                type="video"
                onClick={onPreviousVideo}
                size="normal"
              />
            )}

            {/* Play/Pause button */}
            <PlayPauseButton
              isPlaying={isPlaying}
              onToggle={onPlayPauseClick}
              size="small"
            />

            {/* Next video button */}
            {hasNext && (
              <SkipButton
                direction="forward"
                type="video"
                onClick={onNextVideo}
                size="normal"
              />
            )}

            {/* Volume control */}
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={onVolumeChange}
              onToggleMute={onToggleMute}
            />

            {/* Time display */}
            <TimeDisplay currentTime={currentTime} duration={duration} />
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {/* Subtitle button */}
            {hasSubtitles && (
              <button
                onClick={onSubtitleClick}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Subtitle Settings"
              >
                <Subtitles className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Settings button */}
            <div className="relative">
              <PlaybackSettings
                playbackRate={playbackRate}
                onPlaybackRateChange={onPlaybackRateChange}
                autoplay={autoplay}
                onAutoplayChange={onAutoplayChange}
              />
            </div>

            {/* Miniplayer button */}
            <MiniplayerButton
              onClick={onToggleMiniplayer}
              isMiniplayer={isMiniplayer}
              size="normal"
            />

            {/* Fullscreen button - Only show in main player */}
            {!isMiniplayer && (
              <FullscreenButton
                onClick={onToggleFullscreen}
                size="normal"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

VideoControls.propTypes = {
  showControls: PropTypes.bool.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  currentTime: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
  volume: PropTypes.number.isRequired,
  isMuted: PropTypes.bool.isRequired,
  playbackRate: PropTypes.number.isRequired,
  autoplay: PropTypes.bool.isRequired,
  onPlayPauseClick: PropTypes.func.isRequired,
  onVolumeChange: PropTypes.func.isRequired,
  onToggleMute: PropTypes.func.isRequired,
  onTimeUpdate: PropTypes.func.isRequired,
  onSkipTime: PropTypes.func.isRequired,
  onPlaybackRateChange: PropTypes.func.isRequired,
  onAutoplayChange: PropTypes.func.isRequired,
  onToggleMiniplayer: PropTypes.func.isRequired,
  onToggleFullscreen: PropTypes.func.isRequired,
  onNextVideo: PropTypes.func.isRequired,
  onPreviousVideo: PropTypes.func.isRequired,
  hasNext: PropTypes.bool.isRequired,
  hasPrevious: PropTypes.bool.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  onMouseLeave: PropTypes.func.isRequired,
  isMiniplayer: PropTypes.bool,
  onSubtitleClick: PropTypes.func,
  hasSubtitles: PropTypes.bool
};

export default VideoControls; 