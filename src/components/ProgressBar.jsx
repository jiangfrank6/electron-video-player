import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const ProgressBar = ({ currentTime, duration, onTimeUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [tooltipTime, setTooltipTime] = useState(0);
  const progressRef = useRef(null);
  const startDragPosRef = useRef(null);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    startDragPosRef.current = {
      rect,
      startX: e.clientX
    };
    
    setIsDragging(true);
    updateProgress(e.clientX);

    // Create overlay div for dragging
    const overlay = document.createElement('div');
    overlay.id = 'progress-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.cursor = 'pointer';
    overlay.style.zIndex = '9999';
    document.body.appendChild(overlay);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const updateProgress = (clientX) => {
    if (!progressRef.current || !startDragPosRef.current) return;
    
    const { rect } = startDragPosRef.current;
    const position = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = position / rect.width;
    const newTime = percentage * duration;
    
    setTooltipTime(newTime);
    setTooltipPosition(position);
    setShowTooltip(true);
    onTimeUpdate(newTime);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      updateProgress(e.clientX);
    } else if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const position = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = position / rect.width;
      setTooltipTime(percentage * duration);
      setTooltipPosition(position);
      setShowTooltip(true);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setShowTooltip(false);
    startDragPosRef.current = null;
    
    // Remove overlay
    const overlay = document.getElementById('progress-overlay');
    if (overlay) {
      overlay.remove();
    }

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const overlay = document.getElementById('progress-overlay');
      if (overlay) {
        overlay.remove();
      }
    };
  }, []);

  const progress = (currentTime / duration) * 100;

  return (
    <div className="relative h-12 flex items-center cursor-pointer">
      <div 
        ref={progressRef}
        className="absolute inset-x-0 h-2"
      >
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          className="w-full h-full appearance-none bg-white/30 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:shadow-lg
            [&::-webkit-slider-runnable-track]:rounded-full
            [&::-moz-range-track]:rounded-full"
          style={{
            background: `linear-gradient(to right, white ${progress}%, rgba(255,255,255,0.3) ${progress}%)`
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onChange={(e) => {
            const percentage = parseFloat(e.target.value);
            const newTime = (percentage / 100) * duration;
            onTimeUpdate(newTime);
          }}
        />
      </div>
      
      {showTooltip && (
        <div
          className="absolute -top-8 px-2 py-1 bg-black/80 text-white text-sm rounded transform -translate-x-1/2 z-10"
          style={{ left: `${tooltipPosition}px` }}
        >
          {formatTime(tooltipTime)}
        </div>
      )}
    </div>
  );
};

ProgressBar.propTypes = {
  currentTime: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
  onTimeUpdate: PropTypes.func.isRequired
};

export default ProgressBar; 