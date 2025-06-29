import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ThreePanelSplitterProps {
  leftContent: React.ReactNode;
  centerContent: React.ReactNode;
  rightContent: React.ReactNode;
  initialLeftWidth?: number; // percentage
  initialCenterWidth?: number; // percentage
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
  minLeftWidth = 20,
  minCenterWidth = 15,
  minRightWidth = 20,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [centerWidth, setCenterWidth] = useState(initialCenterWidth);
  
  // Calculate right width from the other two
  const rightWidth = 100 - leftWidth - centerWidth;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<'left' | 'right' | null>(null);
  const dragStartX = useRef<number>(0);
  const initialWidths = useRef<{ left: number; center: number }>({ left: 0, center: 0 });

  const handleMouseDown = useCallback((divider: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    isDragging.current = divider;
    dragStartX.current = e.clientX;
    initialWidths.current = { left: leftWidth, center: centerWidth };
    
    // Add cursor style to body to maintain consistent cursor during drag
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [leftWidth, centerWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    e.preventDefault();
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartX.current;
    const containerWidth = containerRect.width;
    const deltaPercentage = (deltaX / containerWidth) * 100;

    if (isDragging.current === 'left') {
      // Dragging the left divider (between left and center)
      const newLeftWidth = Math.max(
        minLeftWidth, 
        Math.min(
          initialWidths.current.left + deltaPercentage,
          100 - minCenterWidth - minRightWidth
        )
      );
      
      const newCenterWidth = Math.max(
        minCenterWidth,
        Math.min(
          initialWidths.current.center - deltaPercentage,
          100 - newLeftWidth - minRightWidth
        )
      );
      
      setLeftWidth(newLeftWidth);
      setCenterWidth(newCenterWidth);
      
    } else if (isDragging.current === 'right') {
      // Dragging the right divider (between center and right)
      const newCenterWidth = Math.max(
        minCenterWidth,
        Math.min(
          initialWidths.current.center + deltaPercentage,
          100 - initialWidths.current.left - minRightWidth
        )
      );
      
      setCenterWidth(newCenterWidth);
    }
  }, [minLeftWidth, minCenterWidth, minRightWidth]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = null;
    
    // Remove cursor styles
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className="flex h-full relative select-none"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      {/* Left Panel */}
      <div 
        className="h-full overflow-hidden"
        style={{ width: `${leftWidth}%` }}
      >
        {leftContent}
      </div>

      {/* Left Divider */}
      <div
        className="w-1 h-full cursor-col-resize bg-gray-600/20 hover:bg-gray-500/50 transition-colors relative group flex-shrink-0"
        onMouseDown={handleMouseDown('left')}
        style={{ 
          backgroundColor: isDragging.current === 'left' ? 'rgba(107, 114, 128, 0.7)' : undefined 
        }}
      >
        <div className="absolute inset-0 w-3 -ml-1 z-10" /> {/* Wider hit area */}
        <div className="absolute inset-y-0 left-0 w-1 bg-gray-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Center Panel */}
      <div 
        className="h-full overflow-hidden"
        style={{ width: `${centerWidth}%` }}
      >
        {centerContent}
      </div>

      {/* Right Divider */}
      <div
        className="w-1 h-full cursor-col-resize bg-gray-600/20 hover:bg-gray-500/50 transition-colors relative group flex-shrink-0"
        onMouseDown={handleMouseDown('right')}
        style={{ 
          backgroundColor: isDragging.current === 'right' ? 'rgba(107, 114, 128, 0.7)' : undefined 
        }}
      >
        <div className="absolute inset-0 w-3 -ml-1 z-10" /> {/* Wider hit area */}
        <div className="absolute inset-y-0 left-0 w-1 bg-gray-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Right Panel */}
      <div 
        className="h-full overflow-hidden"
        style={{ width: `${rightWidth}%` }}
      >
        {rightContent}
      </div>
    </div>
  );
};

export default ThreePanelSplitter; 