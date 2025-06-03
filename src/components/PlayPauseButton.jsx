import React from 'react';
import PropTypes from 'prop-types';
import { Play, Pause } from 'lucide-react';

const PlayPauseButton = ({ isPlaying, onToggle, size = 'normal', className = '' }) => {
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'w-5 h-5';
      case 'large':
        return 'w-12 h-12';
      default:
        return 'w-8 h-8';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return 'p-2';
      case 'large':
        return 'p-6';
      default:
        return 'p-3';
    }
  };

  return (
    <button
      onClick={onToggle}
      className={`${getPadding()} bg-black/40 hover:bg-black/60 rounded-full transition-all duration-200 backdrop-blur-sm group ${className}`}
    >
      {isPlaying ? (
        <Pause className={`${getIconSize()} text-white group-hover:scale-110 transition-transform`} />
      ) : (
        <Play className={`${getIconSize()} text-white group-hover:scale-110 transition-transform ml-1`} />
      )}
    </button>
  );
};

PlayPauseButton.propTypes = {
  isPlaying: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['small', 'normal', 'large']),
  className: PropTypes.string
};

export default PlayPauseButton; 