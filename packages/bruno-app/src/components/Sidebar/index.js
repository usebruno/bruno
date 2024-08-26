import TitleBar from './TitleBar';
import Collections from './Collections';
import StyledWrapper from './StyledWrapper';
import GitHubButton from 'react-github-btn';
import Preferences from 'components/Preferences';
import Cookies from 'components/Cookies';
import GoldenEdition from './GoldenEdition';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconSettings, IconCookie, IconHeart } from '@tabler/icons';
import { updateLeftSidebarWidth, updateIsDragging, showPreferences } from 'providers/ReduxStore/slices/app';
import { useTheme } from 'providers/Theme';
import Notifications from 'components/Notifications';

const MIN_LEFT_SIDEBAR_WIDTH = 221;
const MAX_LEFT_SIDEBAR_WIDTH = 600;

const Sidebar = () => {
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const preferencesOpen = useSelector((state) => state.app.showPreferences);
  const [goldenEditonOpen, setGoldenEditonOpen] = useState(false);

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
        {goldenEditonOpen && <GoldenEdition onClose={() => setGoldenEditonOpen(false)} />}
        <div className="flex flex-row h-screen w-full">
          {preferencesOpen && <Preferences onClose={() => dispatch(showPreferences(false))} />}
          {cookiesOpen && <Cookies onClose={() => setCookiesOpen(false)} />}

          <div className="flex flex-col w-full" style={{ width: asideWidth }}>
            <div className="flex flex-col flex-grow">
              <TitleBar />
              <Collections />
            </div>

            <div className="footer flex px-1 py-2 absolute bottom-0 left-0 right-0 items-center select-none">
              <div className="flex items-center ml-1 text-xs ">
                <a
                  title="Preferences"
                  className="mr-2 cursor-pointer hover:text-gray-700"
                  onClick={() => dispatch(showPreferences(true))}
                >
                  <IconSettings size={18} strokeWidth={1.5} />
                </a>
                <a
                  title="Cookies"
                  className="mr-2 cursor-pointer hover:text-gray-700"
                  onClick={() => setCookiesOpen(true)}
                >
                  <IconCookie size={18} strokeWidth={1.5} />
                </a>
                <a
                  title="Golden Edition"
                  className="mr-2 cursor-pointer hover:text-gray-700"
                  onClick={() => setGoldenEditonOpen(true)}
                >
                  <IconHeart size={18} strokeWidth={1.5} />
                </a>
                <Notifications />
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
              <div className="flex flex-grow items-center justify-end text-xs mr-2">v1.26.2</div>
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
