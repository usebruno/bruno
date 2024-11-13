import TitleBar from './TitleBar';
import Collections from './Collections';
import StyledWrapper from './StyledWrapper';
import Preferences from 'components/Preferences';
import Cookies from 'components/Cookies';
import ToolHint from 'components/ToolHint';
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
  const [goldenEditionOpen, setGoldenEditionOpen] = useState(false);

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
        {goldenEditionOpen && (
          <GoldenEdition
            onClose={() => {
              setGoldenEditionOpen(false);
              document.querySelector('[data-trigger="golden-edition"]').focus();
            }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="golden-edition-title"
            aria-describedby="golden-edition-description"
          />
        )}
        <div className="flex flex-row h-screen w-full">
          {preferencesOpen && (
            <Preferences
              onClose={() => {
                dispatch(showPreferences(false));
                document.querySelector('[data-trigger="preferences"]').focus();
              }}
              aria-modal="true"
              role="dialog"
              aria-labelledby="preferences-title"
              aria-describedby="preferences-description"
            />
          )}
          {cookiesOpen && (
            <Cookies
              onClose={() => {
                setCookiesOpen(false);
                document.querySelector('[data-trigger="cookies"]').focus();
              }}
              aria-modal="true"
              role="dialog"
              aria-labelledby="cookies-title"
              aria-describedby="cookies-description"
            />
          )}

          <div className="flex flex-col w-full" style={{ width: asideWidth }}>
            <div className="flex flex-col flex-grow">
              <TitleBar />
              <Collections />
            </div>

            <div className="footer flex px-1 py-2 absolute bottom-0 left-0 right-0 items-center select-none">
              <div className="flex items-center ml-1 text-xs ">
                <ul role="menubar" className="flex space-x-2">
                  <li role="menuitem">
                    <a
                      className="cursor-pointer"
                      data-trigger="preferences"
                      onClick={() => dispatch(showPreferences(true))}
                      tabIndex={0}
                      aria-label="Open Preferences"
                    >
                      <ToolHint text="Preferences" toolhintId="Preferences" effect="float" place="top-start" offset={8}>
                        <IconSettings size={18} strokeWidth={1.5} aria-hidden="true" />
                      </ToolHint>
                    </a>
                  </li>
                  <li role="menuitem">
                    <a
                      className="cursor-pointer"
                      data-trigger="cookies"
                      onClick={() => setCookiesOpen(true)}
                      tabIndex={0}
                      aria-label="Open Cookies Settings"
                    >
                      <ToolHint text="Cookies" toolhintId="Cookies" offset={8}>
                        <IconCookie size={18} strokeWidth={1.5} aria-hidden="true" />
                      </ToolHint>
                    </a>
                  </li>
                  <li role="menuitem">
                    <a
                      className="cursor-pointer"
                      data-trigger="golden-edition"
                      onClick={() => setGoldenEditionOpen(true)}
                      tabIndex={0}
                      aria-label="Open Golden Edition"
                    >
                      <ToolHint text="Golden Edition" toolhintId="Golden Edition" offset={8}>
                        <IconHeart size={18} strokeWidth={1.5} aria-hidden="true" />
                      </ToolHint>
                    </a>
                  </li>
                  <li role="menuitem">
                      <Notifications />
                  </li>
                </ul>
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
              <div className="flex flex-grow items-center justify-end text-xs mr-2">v1.34.2</div>
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
