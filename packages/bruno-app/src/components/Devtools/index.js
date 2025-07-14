import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Console from './Console';

const MIN_DEVTOOLS_HEIGHT = 150;
const MAX_DEVTOOLS_HEIGHT = window.innerHeight * 0.7;
const DEFAULT_DEVTOOLS_HEIGHT = 300;

const Devtools = ({ mainSectionRef }) => {
  const isDevtoolsOpen = useSelector((state) => state.logs.isConsoleOpen);
  const [devtoolsHeight, setDevtoolsHeight] = useState(DEFAULT_DEVTOOLS_HEIGHT);
  const [isResizingDevtools, setIsResizingDevtools] = useState(false);

  const handleDevtoolsResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizingDevtools(true);
  }, []);

  const handleDevtoolsResize = useCallback((e) => {
    if (!isResizingDevtools || !mainSectionRef.current) return;
    
    const windowHeight = window.innerHeight;
    const statusBarHeight = 22;
    const mouseY = e.clientY;
    
    // Calculate new devtools height - expanding upward from bottom
    const newHeight = windowHeight - mouseY - statusBarHeight;
    const clampedHeight = Math.min(MAX_DEVTOOLS_HEIGHT, Math.max(MIN_DEVTOOLS_HEIGHT, newHeight));
    setDevtoolsHeight(clampedHeight);

    // Update main section height
    if (mainSectionRef.current) {
      mainSectionRef.current.style.height = `calc(100vh - 22px - ${clampedHeight}px)`;
    }
  }, [isResizingDevtools, mainSectionRef]);

  const handleDevtoolsResizeEnd = useCallback(() => {
    setIsResizingDevtools(false);
  }, []);

  useEffect(() => {
    if (isResizingDevtools) {
      document.addEventListener('mousemove', handleDevtoolsResize);
      document.addEventListener('mouseup', handleDevtoolsResizeEnd);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleDevtoolsResize);
        document.removeEventListener('mouseup', handleDevtoolsResizeEnd);
        document.body.style.userSelect = '';
      };
    }
  }, [isResizingDevtools, handleDevtoolsResize, handleDevtoolsResizeEnd]);

  // Set initial height
  useEffect(() => {
    if (mainSectionRef.current && isDevtoolsOpen) {
      mainSectionRef.current.style.height = `calc(100vh - 22px - ${devtoolsHeight}px)`;
    }
  }, [isDevtoolsOpen, devtoolsHeight, mainSectionRef]);

  if (!isDevtoolsOpen) {
    return null;
  }

  return (
    <>
      <div 
        className="devtools-resize-handle"
        onMouseDown={handleDevtoolsResizeStart}
        style={{
          height: '4px',
          cursor: 'row-resize',
          backgroundColor: isResizingDevtools ? '#0078d4' : 'transparent',
          transition: 'background-color 0.2s ease',
          zIndex: 1000,
          position: 'relative'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#0078d4'}
        onMouseLeave={(e) => e.target.style.backgroundColor = isResizingDevtools ? '#0078d4' : 'transparent'}
      />
      <div style={{ height: `${devtoolsHeight}px`, overflow: 'hidden', zIndex: 999, position: 'relative' }}>
        <Console />
      </div>
    </>
  );
};

export default Devtools; 