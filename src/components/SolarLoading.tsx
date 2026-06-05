import React from 'react';

const SolarLoading: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 overflow-hidden">
      <div className="solar">
        <i className="mercury"></i>
        <i className="venus"></i>
        <i className="earth"></i>
        <i className="mars"></i>
        <i className="belt"></i>
        <i className="jupiter"></i>
        <i className="saturn"></i>
        <i className="uranus"></i>
        <i className="neptune"></i>
      </div>
    </div>
  );
};

export default SolarLoading;
