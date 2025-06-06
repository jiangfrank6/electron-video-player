import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Subtitles } from 'lucide-react';

const SubtitleSettings = ({ subtitles, selectedSubtitle, onSubtitleSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

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
        title="Subtitle Settings"
      >
        <Subtitles className="w-5 h-5 text-white" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-2 min-w-[180px]"
        >
          <div className="px-2 pt-3">
            <div className="text-white text-sm whitespace-nowrap mb-2">Subtitles</div>
            <button
              onClick={() => {
                onSubtitleSelect(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1 text-sm rounded hover:bg-white/20 ${
                selectedSubtitle === null ? 'text-blue-400' : 'text-white'
              }`}
            >
              Off
            </button>
            {subtitles.map((subtitle, index) => (
              <button
                key={index}
                onClick={() => {
                  onSubtitleSelect(subtitle);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1 text-sm rounded hover:bg-white/20 ${
                  selectedSubtitle?.path === subtitle.path ? 'text-blue-400' : 'text-white'
                }`}
              >
                {subtitle.language} {subtitle.title ? `- ${subtitle.title}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

SubtitleSettings.propTypes = {
  subtitles: PropTypes.arrayOf(
    PropTypes.shape({
      language: PropTypes.string.isRequired,
      title: PropTypes.string,
      path: PropTypes.string.isRequired
    })
  ).isRequired,
  selectedSubtitle: PropTypes.shape({
    language: PropTypes.string.isRequired,
    title: PropTypes.string,
    path: PropTypes.string.isRequired
  }),
  onSubtitleSelect: PropTypes.func.isRequired
};

export default SubtitleSettings; 