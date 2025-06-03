import React from 'react';
import PropTypes from 'prop-types';

const TimeDisplay = ({ currentTime, duration }) => {
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="text-white text-sm">
      {formatTime(currentTime)} / {formatTime(duration)}
    </div>
  );
};

TimeDisplay.propTypes = {
  currentTime: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired
};

export default TimeDisplay; 