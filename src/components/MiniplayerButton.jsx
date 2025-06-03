import React from 'react';
import PropTypes from 'prop-types';
import { MinimizeIcon, Maximize2 } from 'lucide-react';

const MiniplayerButton = ({
  isMiniplayer = false,
  onClick,
  size = 'normal',
  className = ''
}) => {
  const Icon = isMiniplayer ? Maximize2 : MinimizeIcon;

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4';
      case 'large':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return 'p-1.5';
      case 'large':
        return 'p-2.5';
      default:
        return 'p-2';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${getPadding()}
        rounded-full
        transition-all duration-200
        bg-black/40 backdrop-blur-sm
        hover:bg-black/60
        group
        ${className}
      `}
      title={isMiniplayer ? 'Exit miniplayer' : 'Enter miniplayer'}
    >
      <Icon 
        className={`
          ${getIconSize()}
          text-white
          group-hover:scale-110
          transition-transform
        `}
      />
    </button>
  );
};

MiniplayerButton.propTypes = {
  isMiniplayer: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['small', 'normal', 'large']),
  className: PropTypes.string
};

export default MiniplayerButton; 