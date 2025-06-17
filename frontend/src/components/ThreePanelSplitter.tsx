import React, { useState, useRef, useCallback } from 'react';

interface ThreePanelSplitterProps {
  leftContent: React.ReactNode;
  centerContent: React.ReactNode;
  rightContent: React.ReactNode;
  initialLeftWidth?: number; // percentage
  initialCenterWidth?: number; // percentage
  initialRightWidth?: number; // percentage
  minLeftWidth?: number; // percentage
  minCenterWidth?: number; // percentage
  minRightWidth?: number; // percentage
}

const ThreePanelSplitter: React.FC<ThreePanelSplitterProps> = ({
  leftContent,
  centerContent,
  rightContent,
  initialLeftWidth = 35,
  initialCenterWidth = 25,
  initialRightWidth = 40,
  minLeftWidth = 20,
  minCenterWidth = 15,
  minRightWidth = 20,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [centerWidth, setCenterWidth] = useState(initialCenterWidth);
  const rightWidth = 100 - leftWidth - centerWidth;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<'left' | 'right' | null>(null);

  const handleMouseDown = useCallback((divider: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = divider;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const containerWidth = containerRect.width;
    const mousePercentage = (mouseX / containerWidth) * 100;

    if (isDragging.current === 'left') {
      // Dragging the left divider
      const newLeftWidth = Math.max(minLeftWidth, Math.min(mousePercentage, 100 - minCenterWidth - minRightWidth));
      const remainingWidth = 100 - newLeftWidth;
      const centerToRightRatio = centerWidth / (centerWidth + rightWidth);
      const newCenterWidth = Math.max(minCenterWidth, remainingWidth * centerToRightRatio);
      
      setLeftWidth(newLeftWidth);
      setCenterWidth(Math.min(newCenterWidth, 100 - newLeftWidth - minRightWidth));
    } else if (isDragging.current === 'right') {
      // Dragging the right divider (between center and right)
      const newRightWidth = Math.max(minRightWidth, Math.min(100 - mousePercentage, 100 - leftWidth - minCenterWidth));
      const newCenterWidth = Math.max(minCenterWidth, 100 - leftWidth - newRightWidth);
      
      setCenterWidth(newCenterWidth);
    }
  }, [leftWidth, centerWidth, rightWidth, minLeftWidth, minCenterWidth, minRightWidth]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  return (
    <div 
      ref={containerRef}
      className="flex h-full relative"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      {/* Left Panel */}
      <div 
        className="h-full"
        style={{ width: `${leftWidth}%` }}
      >
        {leftContent}
      </div>

      {/* Left Divider */}
      <div
        className="w-1 h-full cursor-col-resize bg-gray-600/20 hover:bg-gray-500/50 transition-colors relative group"
        onMouseDown={handleMouseDown('left')}
      >
        <div className="absolute inset-0 w-3 -ml-1" /> {/* Wider hit area */}
      </div>

      {/* Center Panel */}
      <div 
        className="h-full"
        style={{ width: `${centerWidth}%` }}
      >
        {centerContent}
      </div>

      {/* Right Divider */}
      <div
        className="w-1 h-full cursor-col-resize bg-gray-600/20 hover:bg-gray-500/50 transition-colors relative group"
        onMouseDown={handleMouseDown('right')}
      >
        <div className="absolute inset-0 w-3 -ml-1" /> {/* Wider hit area */}
      </div>

      {/* Right Panel */}
      <div 
        className="h-full"
        style={{ width: `${rightWidth}%` }}
      >
        {rightContent}
      </div>
    </div>
  );
};

export default ThreePanelSplitter; 