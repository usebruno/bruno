import TitleBar from './TitleBar';
import Collections from './Collections';
import StyledWrapper from './StyledWrapper';
import GitHubButton from 'react-github-btn';
import Preferences from 'components/Preferences';
import Cookies from 'components/Cookies';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconSettings, IconCookie } from '@tabler/icons';
import { updateLeftSidebarWidth, updateIsDragging, showPreferences } from 'providers/ReduxStore/slices/app';
import { useTheme } from 'providers/Theme';

const MIN_LEFT_SIDEBAR_WIDTH = 222;
const MAX_LEFT_SIDEBAR_WIDTH = 600;

const Sidebar = () => {
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const preferencesOpen = useSelector((state) => state.app.showPreferences);

  const [asideWidth, setAsideWidth] = useState(leftSidebarWidth);
  const [cookiesOpen, setCookiesOpen] = useState(false);

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
          {preferencesOpen && <Preferences onClose={() => dispatch(showPreferences(false))} />}
          {cookiesOpen && <Cookies onClose={() => setCookiesOpen(false)} />}

          <div className="flex flex-col w-full" style={{ width: asideWidth }}>
            <div className="flex flex-col flex-grow">
              <TitleBar />
              <Collections />
            </div>

            <div className="footer flex px-1 py-2 absolute bottom-0 left-0 right-0 items-center cursor-pointer select-none">
              <div className="flex items-center ml-1 text-xs ">
                <IconSettings
                  size={18}
                  strokeWidth={1.5}
                  className="mr-2 hover:text-gray-700"
                  onClick={() => dispatch(showPreferences(true))}
                />
                <IconCookie
                  size={18}
                  strokeWidth={1.5}
                  className="mr-2 hover:text-gray-700"
                  onClick={() => setCookiesOpen(true)}
                />
              </div>
              <div className="pl-1" style={{ position: 'relative', top: '3px' }}>
                {/* This will get moved to home page */}
                {/* <GitHubButton
                  href="https://github.com/usebruno/bruno"
                  data-color-scheme={storedTheme}
                  data-show-count="true"
                  aria-label="Star usebruno/bruno on GitHub"
                >
                  Star
                </GitHubButton> */}
              </div>
              <div className="flex flex-grow items-center justify-end text-xs mr-2">v1.4.0</div>
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
