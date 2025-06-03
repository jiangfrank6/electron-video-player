import React from 'react';
import SkipButton from '../components/SkipButton';

const TestComponents = () => {
  const handleClick = () => {
    console.log('Button clicked');
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="text-white text-3xl font-bold mb-8">Component Testing Page</h1>
      
      <section className="mb-12">
        <h2 className="text-white text-2xl font-semibold mb-4">SkipButton Variants</h2>
        
        <div className="space-y-8">
          {/* Time Skip Buttons */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-white text-xl mb-4">Time Skip Buttons</h3>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-gray-400 mb-2">Small</p>
                <div className="flex gap-2">
                  <SkipButton direction="backward" type="time" size="small" onClick={handleClick} />
                  <SkipButton direction="forward" type="time" size="small" onClick={handleClick} />
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 mb-2">Normal</p>
                <div className="flex gap-2">
                  <SkipButton direction="backward" type="time" size="normal" onClick={handleClick} />
                  <SkipButton direction="forward" type="time" size="normal" onClick={handleClick} />
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 mb-2">Large</p>
                <div className="flex gap-2">
                  <SkipButton direction="backward" type="time" size="large" onClick={handleClick} />
                  <SkipButton direction="forward" type="time" size="large" onClick={handleClick} />
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 mb-2">Disabled</p>
                <div className="flex gap-2">
                  <SkipButton direction="backward" type="time" disabled onClick={handleClick} />
                  <SkipButton direction="forward" type="time" disabled onClick={handleClick} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Video Skip Buttons */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-white text-xl mb-4">Video Skip Buttons</h3>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-gray-400 mb-2">Small</p>
                <div className="flex gap-2">
                  <SkipButton direction="backward" type="video" size="small" onClick={handleClick} />
                  <SkipButton direction="forward" type="video" size="small" onClick={handleClick} />
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 mb-2">Normal</p>
                <div className="flex gap-2">
                  <SkipButton direction="backward" type="video" size="normal" onClick={handleClick} />
                  <SkipButton direction="forward" type="video" size="normal" onClick={handleClick} />
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 mb-2">Large</p>
                <div className="flex gap-2">
                  <SkipButton direction="backward" type="video" size="large" onClick={handleClick} />
                  <SkipButton direction="forward" type="video" size="large" onClick={handleClick} />
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 mb-2">Disabled</p>
                <div className="flex gap-2">
                  <SkipButton direction="backward" type="video" disabled onClick={handleClick} />
                  <SkipButton direction="forward" type="video" disabled onClick={handleClick} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TestComponents; 