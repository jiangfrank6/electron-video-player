import React from 'react';
import PropTypes from 'prop-types';
import { Subtitles } from 'lucide-react';

const SubtitleButton = ({ onClick, isExtracting, hasSubtitles, size = 'normal' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    normal: 'w-10 h-10',
    large: 'w-12 h-12'
  };

  return (
    <button
      onClick={onClick}
      className={`p-2 bg-gradient-to-r from-gray-700/80 to-gray-800/80 hover:from-gray-600/90 hover:to-gray-700/90 backdrop-blur-xl rounded-full opacity-90 hover:opacity-100 transition-all duration-200 ${sizeClasses[size]}`}
      disabled={isExtracting}
    >
      <Subtitles 
        className={`w-5 h-5 text-white ${isExtracting ? 'animate-pulse' : ''} ${hasSubtitles ? 'text-blue-400' : ''}`}
      />
    </button>
  );
};

SubtitleButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  isExtracting: PropTypes.bool,
  hasSubtitles: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'normal', 'large'])
};

export default SubtitleButton; 