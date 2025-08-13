import React from 'react';

const DemoVideo: React.FC = () => {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl">
      <video
        className="w-full h-auto"
        autoPlay
        loop
        muted
        playsInline
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <source src="/demo-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default DemoVideo;
