import React from 'react';
import PropTypes from 'prop-types';
import { Volume2, VolumeX } from 'lucide-react';

const VolumeControl = ({ volume, isMuted, onVolumeChange, onToggleMute }) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onToggleMute}
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
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="w-20 accent-white"
      />
    </div>
  );
};

VolumeControl.propTypes = {
  volume: PropTypes.number.isRequired,
  isMuted: PropTypes.bool.isRequired,
  onVolumeChange: PropTypes.func.isRequired,
  onToggleMute: PropTypes.func.isRequired
};

export default VolumeControl; 