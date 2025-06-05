import React from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

const SubtitleModal = ({ isOpen, onClose, subtitles, selectedSubtitle, onSubtitleSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-96 max-w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Subtitle Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onSubtitleSelect(null)}
            className={`w-full p-3 text-left rounded-lg transition-colors ${
              selectedSubtitle === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            Off
          </button>

          {subtitles.map((subtitle, index) => (
            <button
              key={index}
              onClick={() => onSubtitleSelect(subtitle)}
              className={`w-full p-3 text-left rounded-lg transition-colors ${
                selectedSubtitle?.path === subtitle.path
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {subtitle.language} {subtitle.title ? `- ${subtitle.title}` : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

SubtitleModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
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

export default SubtitleModal; 