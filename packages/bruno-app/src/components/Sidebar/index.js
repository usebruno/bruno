import Actions from 'components/Actions';
import GitHubButton from 'react-github-btn';
import Collections from './Collections';
import StyledWrapper from './StyledWrapper';
import TitleBar from './TitleBar';

import { updateIsDragging, updateLeftSidebarWidth } from 'providers/ReduxStore/slices/app';
import { useTheme } from 'providers/Theme';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const MIN_LEFT_SIDEBAR_WIDTH = 222;
const MAX_LEFT_SIDEBAR_WIDTH = 600;

const Sidebar = () => {
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);

  const [asideWidth, setAsideWidth] = useState(leftSidebarWidth);

  const { storedTheme } = useTheme();

  const dispatch = useDispatch();
  const [dragging, setDragging] = useState(false);

  const handleMouseMove = (e) => {
    if (dragging) {
      e.preventDefault();
      let width = e.clientX + 2;
      if (width < MIN_LEFT_SIDEBAR_WIDTH || width > MAX_LEFT_SIDEBAR_WIDTH) {
        return;
      }
      setAsideWidth(width);
    }
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
    <StyledWrapper className="flex relative h-screen">
      <aside>
        <div className="flex flex-row h-screen w-full">
          <div className="flex flex-col w-full" style={{ width: asideWidth }}>
            <div className="flex flex-col flex-grow overflow-hidden">
              <TitleBar />
              <Actions />
              <Collections />
            </div>

            <div className="footer flex px-1 py-2 items-center cursor-pointer select-none">
              <div className="pl-1" style={{ position: 'relative' }}>
                <GitHubButton
                  href="https://github.com/usebruno/bruno"
                  data-color-scheme={storedTheme}
                  data-show-count="true"
                  aria-label="Star usebruno/bruno on GitHub"
                >
                  Star
                </GitHubButton>
              </div>
              <div className="flex flex-grow items-center justify-end text-xs mr-2">v0.27.2</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="absolute drag-sidebar h-full" onMouseDown={handleDragbarMouseDown}>
        <div className="drag-request-border" />
      </div>
    </StyledWrapper>
  );
};

export default Sidebar;
