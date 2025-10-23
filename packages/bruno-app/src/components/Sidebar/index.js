import TitleBar from './TitleBar';
import Collections from './Collections';
import StyledWrapper from './StyledWrapper';

import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateLeftSidebarWidth, updateIsDragging } from 'providers/ReduxStore/slices/app';

const MIN_LEFT_SIDEBAR_WIDTH = 221;
const MAX_LEFT_SIDEBAR_WIDTH = 600;

const Sidebar = () => {
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const [asideWidth, setAsideWidth] = useState(leftSidebarWidth);
  const lastWidthRef = useRef(leftSidebarWidth);

  const dispatch = useDispatch();
  const [dragging, setDragging] = useState(false);

  const currentWidth = sidebarCollapsed ? 0 : asideWidth;

  // Clamp helper keeps width in allowed range
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const handleMouseMove = (e) => {
    if (!dragging || sidebarCollapsed) return;
    e.preventDefault();
    const nextWidth = clamp(e.clientX + 2, MIN_LEFT_SIDEBAR_WIDTH, MAX_LEFT_SIDEBAR_WIDTH);
    if (Math.abs(nextWidth - lastWidthRef.current) < 3) return;
    lastWidthRef.current = nextWidth;
    setAsideWidth(nextWidth);
  };

  const handleMouseUp = (e) => {
    if (dragging) {
      e.preventDefault();
      setDragging(false);
      dispatch(
        updateLeftSidebarWidth({
          leftSidebarWidth: asideWidth
        })
      );
      dispatch(
        updateIsDragging({
          isDragging: false
        })
      );
    }
  };
  const handleDragbarMouseDown = (e) => {
    e.preventDefault();
    if (sidebarCollapsed) {
      return;
    }
    setDragging(true);
    dispatch(
      updateIsDragging({
        isDragging: true
      })
    );
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dragging, asideWidth]);

  useEffect(() => {
    setAsideWidth(leftSidebarWidth);
  }, [leftSidebarWidth]);

  return (
    <StyledWrapper className="flex relative h-full">
      <aside className="sidebar" style={{ width: currentWidth, transition: dragging ? 'none' : 'width 0.2s ease-in-out' }}>
        <div className="flex flex-row h-full w-full">
          <div className="flex flex-col w-full" style={{ width: asideWidth }}>
            <div className="flex flex-col flex-grow">
              <TitleBar />
              <Collections />
            </div>
          </div>
        </div>
      </aside>

      {!sidebarCollapsed && (
        <div className="absolute sidebar-drag-handle h-full" onMouseDown={handleDragbarMouseDown}>
          <div className="drag-request-border" />
        </div>
      )}
    </StyledWrapper>
  );
};

export default Sidebar;
