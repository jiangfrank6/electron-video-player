import React from 'react';
import PropTypes from 'prop-types';
import { RotateCw, RotateCcw, SkipForward, SkipBack } from 'lucide-react';

const SkipButton = ({ 
  direction = 'forward',
  type = 'time',
  onClick,
  size = 'normal',
  disabled = false,
  className = ''
}) => {
  const getIcon = () => {
    if (type === 'time') {
      return direction === 'forward' ? RotateCw : RotateCcw;
    }
    return direction === 'forward' ? SkipForward : SkipBack;
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'w-5 h-5';
      case 'large':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return 'p-2';
      case 'large':
        return 'p-3';
      default:
        return 'p-2.5';
    }
  };

  const Icon = getIcon();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${getPadding()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        rounded-full transition-all duration-200 group
        bg-black/40 backdrop-blur-sm
        hover:bg-black/60
        ${className}
      `}
    >
      <Icon 
        className={`
          ${getIconSize()} 
          ${disabled ? 'text-gray-500' : 'text-white'}
          group-hover:scale-110 
          transition-transform
        `}
      />
    </button>
  );
};

SkipButton.propTypes = {
  direction: PropTypes.oneOf(['forward', 'backward']),
  type: PropTypes.oneOf(['time', 'video']),
  onClick: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['small', 'normal', 'large']),
  disabled: PropTypes.bool,
  className: PropTypes.string
};

export default SkipButton; 