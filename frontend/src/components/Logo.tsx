import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* SVG Icon */}
      <svg 
        className={sizeClasses[size]} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Document background */}
        <rect x="6" y="4" width="16" height="24" rx="2" fill="#3B82F6" stroke="#1E40AF" strokeWidth="1"/>
        
        {/* Document lines */}
        <rect x="9" y="8" width="10" height="1" rx="0.5" fill="white"/>
        <rect x="9" y="11" width="8" height="1" rx="0.5" fill="white"/>
        <rect x="9" y="14" width="10" height="1" rx="0.5" fill="white"/>
        <rect x="9" y="17" width="6" height="1" rx="0.5" fill="white"/>
        <rect x="9" y="20" width="8" height="1" rx="0.5" fill="white"/>
        
        {/* Gear */}
        <g transform="translate(20, 8)">
          {/* Gear outer circle */}
          <circle cx="6" cy="6" r="5" fill="#1F2937" stroke="#374151" strokeWidth="0.5"/>
          
          {/* Gear teeth */}
          <rect x="5.5" y="1" width="1" height="2" rx="0.5" fill="#6B7280"/>
          <rect x="5.5" y="9" width="1" height="2" rx="0.5" fill="#6B7280"/>
          <rect x="1" y="5.5" width="2" height="1" rx="0.5" fill="#6B7280"/>
          <rect x="9" y="5.5" width="2" height="1" rx="0.5" fill="#6B7280"/>
          
          {/* Gear inner circle */}
          <circle cx="6" cy="6" r="2" fill="#9CA3AF"/>
          <circle cx="6" cy="6" r="1" fill="#1F2937"/>
        </g>
        
        {/* Small decorative elements */}
        <circle cx="24" cy="22" r="1.5" fill="#10B981"/>
        <circle cx="26" cy="24" r="1" fill="#F59E0B"/>
      </svg>

      {/* Text */}
      {showText && (
        <span className={`font-bold text-white ${textSizes[size]}`}>
          ResumeCraft
        </span>
      )}
    </div>
  );
};

export default Logo; 