import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { darken } from 'polished';
import Console from './Console';
import { useTheme } from 'providers/Theme';
import { setDevtoolsHeight } from 'providers/ReduxStore/slices/logs';

const MIN_DEVTOOLS_HEIGHT = 150;
const MAX_DEVTOOLS_HEIGHT = window.innerHeight * 0.7;

const Devtools = ({ mainSectionRef }) => {
  const dispatch = useDispatch();
  const isDevtoolsOpen = useSelector((state) => state.logs.isConsoleOpen);
  const devtoolsHeight = useSelector((state) => state.logs.devtoolsHeight);
  const [isResizingDevtools, setIsResizingDevtools] = useState(false);
  const { theme } = useTheme();

  const dragHandleColor = useMemo(() => darken(0.1, theme.primary.subtle), [theme.primary.subtle]);

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
    dispatch(setDevtoolsHeight(clampedHeight));

    // Update main section height
    if (mainSectionRef.current) {
      mainSectionRef.current.style.height = `calc(100vh - 22px - ${clampedHeight}px)`;
    }
  }, [isResizingDevtools, mainSectionRef, dispatch]);

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
        onMouseDown={handleDevtoolsResizeStart}
        style={{
          height: '2px',
          cursor: 'row-resize',
          backgroundColor: isResizingDevtools ? dragHandleColor : 'transparent',
          transition: 'background-color 0.2s ease',
          zIndex: 20,
          position: 'relative'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = dragHandleColor}
        onMouseLeave={(e) => e.target.style.backgroundColor = isResizingDevtools ? dragHandleColor : 'transparent'}
      />
      <div style={{ height: `${devtoolsHeight}px`, overflow: 'hidden', position: 'relative' }}>
        <Console />
      </div>
    </>
  );
};

export default Devtools;
