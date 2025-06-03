import React from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft, X } from 'lucide-react';

const VideoHeader = ({
  videoTitle,
  isMiniplayer,
  onBackClick,
  onCloseMiniplayerClick,
  showControls,
  className
}) => {
  if (!videoTitle) return null;

  return (
    <div 
      className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      } ${showControls ? 'pointer-events-auto' : 'pointer-events-none'} ${className}`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          {!isMiniplayer && (
            <button
              onClick={onBackClick}
              className="p-2 hover:bg-white/20 rounded-full transition-colors mr-2"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <h1 className="text-white text-lg font-medium truncate">
            {videoTitle}
          </h1>
        </div>

        {isMiniplayer && (
          <button
            onClick={onCloseMiniplayerClick}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

const EmptyStateHeader = ({ onBackClick }) => {
  return (
    <div className="absolute top-0 left-0 right-0 p-4">
      <div className="flex items-center">
        <button
          onClick={onBackClick}
          className="p-2 hover:bg-white/20 rounded-full transition-colors mr-2"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white text-lg font-medium">
          Video Player
        </h1>
      </div>
    </div>
  );
};

EmptyStateHeader.propTypes = {
  onBackClick: PropTypes.func.isRequired
};

VideoHeader.EmptyState = EmptyStateHeader;

VideoHeader.propTypes = {
  videoTitle: PropTypes.string,
  isMiniplayer: PropTypes.bool,
  onBackClick: PropTypes.func.isRequired,
  onCloseMiniplayerClick: PropTypes.func,
  showControls: PropTypes.bool,
  className: PropTypes.string
};

export default VideoHeader; 