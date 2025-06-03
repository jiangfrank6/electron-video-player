import React from 'react';
import PropTypes from 'prop-types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Play, X, GripVertical } from 'lucide-react';

const VideoQueue = ({
  videos,
  currentIndex,
  onVideoSelect,
  onVideoRemove,
  onQueueReorder,
  onVideoUpload,
  onSampleVideoSelect,
  sampleVideos = []
}) => {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    onQueueReorder(result.source.index, result.destination.index);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onVideoUpload(files);
    }
  };

  return (
    <div className="w-80 flex flex-col bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-950 via-gray-900 to-black">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Video Queue
        </h2>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="video-queue" direction="vertical">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`flex-1 overflow-y-auto p-4 ${
                snapshot.isDraggingOver ? 'bg-gray-900/50' : ''
              }`}
            >
              {/* Upload button - Always visible */}
              <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-4 bg-[#0a0b0e]">
                <label className="flex items-center justify-center w-full p-3 bg-[#25262b] hover:bg-[#2c2d31] rounded-lg cursor-pointer transition-all duration-200">
                  <span className="text-white">Add More Videos</span>
                  <input
                    type="file"
                    accept="video/*,.mkv"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Container for draggable content */}
              <div className="mt-4">
                {/* Sample videos section - only show if queue is empty */}
                {videos.length === 0 && (
                  <div className="flex flex-col gap-2">
                    {sampleVideos.map((video) => (
                      <div
                        key={video.path}
                        className="flex items-center h-[52px] p-3 bg-[#1e1f25] hover:bg-[#25262b] rounded-lg transition-all duration-200"
                      >
                        {/* Grip icon for visual consistency */}
                        <div className="mr-2">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>

                        {/* Video info */}
                        <div 
                          className="flex-1 min-w-0 mr-2 cursor-pointer"
                          onClick={() => onSampleVideoSelect(video)}
                        >
                          <div className="text-white font-medium truncate">
                            {video.name}
                          </div>
                        </div>

                        {/* Play button */}
                        <button
                          onClick={() => onSampleVideoSelect(video)}
                          className="p-1.5 hover:bg-blue-500 rounded transition-colors"
                          title="Play video"
                        >
                          <Play className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Video queue items */}
                {videos.map((video, index) => (
                  <Draggable 
                    key={video.path} 
                    draggableId={video.path} 
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                          transform: provided.draggableProps.style?.transform
                            ? `translate(0px, ${provided.draggableProps.style.transform.split(',')[1]}`
                            : 'translate(0px, 0px)'
                        }}
                        className={`flex items-center h-[52px] p-3 mb-2 rounded-lg transition-all duration-200 ${
                          snapshot.isDragging
                            ? 'bg-blue-600 shadow-lg'
                            : currentIndex === index
                            ? 'bg-[#2c2d31]'
                            : 'bg-[#1e1f25] hover:bg-[#25262b]'
                        }`}
                      >
                        {/* Drag handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="mr-2 cursor-grab active:cursor-grabbing hover:text-gray-300"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>

                        {/* Video info */}
                        <div 
                          className="flex-1 min-w-0 mr-2 cursor-pointer"
                          onClick={() => onVideoSelect(video)}
                        >
                          <div className="text-white font-medium truncate">
                            {video.name || video.path.split('/').pop()}
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => onVideoRemove(index)}
                          className="p-1.5 hover:bg-red-500 rounded transition-colors"
                          title="Remove from queue"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

VideoQueue.propTypes = {
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      path: PropTypes.string.isRequired,
      file: PropTypes.object
    })
  ).isRequired,
  currentIndex: PropTypes.number.isRequired,
  onVideoSelect: PropTypes.func.isRequired,
  onVideoRemove: PropTypes.func.isRequired,
  onQueueReorder: PropTypes.func.isRequired,
  onVideoUpload: PropTypes.func.isRequired,
  onSampleVideoSelect: PropTypes.func.isRequired,
  sampleVideos: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired
    })
  )
};

export default VideoQueue; 