import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ResizableSplitterProps {
  topContent: React.ReactNode;
  bottomContent: React.ReactNode;
  initialBottomHeight?: number;
  minTopHeight?: number;
  minBottomHeight?: number;
  maxBottomHeight?: number;
}

const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  topContent,
  bottomContent,
  initialBottomHeight = 320,
  minTopHeight = 200,
  minBottomHeight = 150,
  maxBottomHeight = 600,
}) => {
  const [bottomHeight, setBottomHeight] = useState(initialBottomHeight);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerHeight = containerRect.height;
    const mouseY = e.clientY;
    const relativeY = mouseY - containerRect.top;
    
    // Calculate new bottom height (distance from bottom)
    const newBottomHeight = containerHeight - relativeY;
    
    // Apply constraints
    const constrainedBottomHeight = Math.max(
      minBottomHeight,
      Math.min(maxBottomHeight, newBottomHeight)
    );
    
    // Make sure top panel doesn't get too small
    const topHeight = containerHeight - constrainedBottomHeight;
    if (topHeight >= minTopHeight) {
      setBottomHeight(constrainedBottomHeight);
    }
  }, [isDragging, minTopHeight, minBottomHeight, maxBottomHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Top Content */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ height: `calc(100% - ${bottomHeight}px)` }}
      >
        {topContent}
      </div>

      {/* Resizer Handle */}
      <div
        className={`relative border-t border-gray-600/30 transition-colors cursor-ns-resize ${
          isDragging ? 'border-gray-500/50' : ''
        }`}
        style={{ 
          height: '4px',
          backgroundColor: '#212121'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Visual indicator */}
        <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2">
          <div className="flex justify-center">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Content */}
      <div 
        className="overflow-hidden"
        style={{ height: `${bottomHeight}px` }}
      >
        {bottomContent}
      </div>
    </div>
  );
};

export default ResizableSplitter; 