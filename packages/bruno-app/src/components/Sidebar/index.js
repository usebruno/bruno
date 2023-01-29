import MenuBar from './MenuBar';
import TitleBar from './TitleBar';
import Collections from './Collections';
import StyledWrapper, { BottomWrapper, VersionNumber } from './StyledWrapper';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconChevronsRight } from '@tabler/icons';
import { updateLeftSidebarWidth, updateIsDragging, toggleLeftMenuBar } from 'providers/ReduxStore/slices/app';

const MIN_LEFT_SIDEBAR_WIDTH = 222;
const MAX_LEFT_SIDEBAR_WIDTH = 600;

const Sidebar = () => {
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const leftMenuBarOpen = useSelector((state) => state.app.leftMenuBarOpen);

  const [asideWidth, setAsideWidth] = useState(leftSidebarWidth);

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
    <StyledWrapper className="flex relative">
      <aside style={{ width: `${asideWidth}px`, minWidth: `${asideWidth}px` }}>
        <div className="flex flex-row h-full w-full">
          {leftMenuBarOpen && <MenuBar />}

          <div className="flex flex-col w-full">
            <div className="flex flex-col flex-grow">
              <TitleBar />
              <Collections />
            </div>

            <div className="footer flex px-1 py-2 items-center cursor-pointer select-none">
              <div className="flex items-center ml-1 text-xs ">
                {!leftMenuBarOpen && <IconChevronsRight size={24} strokeWidth={1.5} className="mr-2  hover:text-gray-700" onClick={() => dispatch(toggleLeftMenuBar())} />}
                {/* <IconLayoutGrid size={20} strokeWidth={1.5} className="mr-2"/> */}
                {/* Need to ut github stars link here */}
              </div>
              <div className="pl-1">
                <iframe
                  src="https://ghbtns.com/github-btn.html?user=usebruno&repo=bruno&type=star&count=true"
                  frameBorder="0"
                  scrolling="0"
                  width="100"
                  height="20"
                  title="GitHub"
                ></iframe>
              </div>
              <div className="flex flex-grow items-center justify-end text-xs mr-2">v0.7.1</div>
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
