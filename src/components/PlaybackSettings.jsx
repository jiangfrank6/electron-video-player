import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Settings } from 'lucide-react';

const PlaybackSettings = ({ playbackRate, onPlaybackRateChange, autoplay, onAutoplayChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close menu if click is outside menu and button
      if (
        menuRef.current && 
        buttonRef.current && 
        !menuRef.current.contains(event.target) && 
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/20 rounded-full transition-colors"
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-2 min-w-[180px]"
        >
          {/* Autoplay toggle */}
          <div className="px-2 py-2 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">Autoplay</span>
              <button
                onClick={() => onAutoplayChange(!autoplay)}
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
          <div className="px-2 pt-3">
            <div className="text-white text-sm whitespace-nowrap mb-2">Playback Speed</div>
            {rates.map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  onPlaybackRateChange(rate);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1 text-sm rounded hover:bg-white/20 ${
                  playbackRate === rate ? 'text-blue-400' : 'text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

PlaybackSettings.propTypes = {
  playbackRate: PropTypes.number.isRequired,
  onPlaybackRateChange: PropTypes.func.isRequired,
  autoplay: PropTypes.bool.isRequired,
  onAutoplayChange: PropTypes.func.isRequired
};

export default PlaybackSettings; 