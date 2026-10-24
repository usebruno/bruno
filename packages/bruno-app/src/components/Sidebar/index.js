import { SidebarAccordionProvider } from './SidebarAccordionContext';
import SidebarContent from './SidebarContent';
import StyledWrapper from './StyledWrapper';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector, useDispatch, useStore } from 'react-redux';
import {
  updateLeftSidebarWidth,
  updateIsDragging,
  toggleSidebarSearch,
  toggleSidebarCollapse
} from 'providers/ReduxStore/slices/app';
import { setLocalStorageValue, SIDEBAR_WIDTH_KEY, SIDEBAR_COLLAPSED_KEY } from 'utils/common/localStorage';
import CollectionsSection from './Sections/CollectionsSection/index';
import ApiSpecsSection from './Sections/ApiSpecsSection/index';
import MockServersSection from './Sections/MockServersSection/index';
import { Tooltip } from 'react-tooltip';
import useKeybinding from 'hooks/useKeybinding';
import useKeybindingDisplayText from 'hooks/useKeybindingDisplayText';
import useClearSidebarSelectionOnEscape from 'hooks/useClearSidebarSelectionOnEscape';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';

const MIN_LEFT_SIDEBAR_WIDTH = 220;
const MAX_LEFT_SIDEBAR_WIDTH = 600;
// Dragging the sidebar narrower than this collapses it. dragging back past it re-opens it
const COLLAPSE_THRESHOLD = 150;
// Pointer travel (px) before a press on the handle counts as a drag rather than a click
const MIN_DRAG_DISTANCE = 3;

const Sidebar = () => {
  const isMockServerEnabled = useBetaFeature(BETA_FEATURES.MOCK_SERVER);
  const sidebarSections = useMemo(() => {
    const sections = [
      {
        id: 'collections',
        component: CollectionsSection
      },
      {
        id: 'api-specs',
        component: ApiSpecsSection
      }
    ];

    if (isMockServerEnabled) {
      sections.push({
        id: 'mock-servers',
        component: MockServersSection
      });
    }

    return sections;
  }, [isMockServerEnabled]);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const [asideWidth, setAsideWidth] = useState(leftSidebarWidth);
  const lastWidthRef = useRef(leftSidebarWidth);

  const dispatch = useDispatch();
  const store = useStore();
  const getKeybindingDisplayText = useKeybindingDisplayText();
  const [dragging, setDragging] = useState(false);
  const [dragCollapsed, setDragCollapsed] = useState(false);
  const movedRef = useRef(false);
  const dragStartXRef = useRef(0);

  // Sidebar search
  useKeybinding('sidebarSearch', (e) => {
    const target = e?.target || document.activeElement;
    if (target?.closest?.('.CodeMirror')) return; // let editor's native `Find` handle it
    dispatch(toggleSidebarSearch());
    return false;
  });

  useClearSidebarSelectionOnEscape();

  const displayWidth = dragging ? asideWidth : leftSidebarWidth;
  const isCollapsed = dragging ? dragCollapsed : sidebarCollapsed;
  const currentWidth = isCollapsed ? 0 : displayWidth;

  // Clamp helper keeps width in allowed range
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const handleMouseMove = (e) => {
    e.preventDefault();
    if (!movedRef.current) {
      // click will faild to open the sidebar if pointer moves a bit on click. It will be consdier as drag
      // Until the pointer has moved a few pixels from where it was pressed, treat it as a click (not a drag)
      if (Math.abs(e.clientX - dragStartXRef.current) < MIN_DRAG_DISTANCE) return;
      movedRef.current = true;
    }
    const rawWidth = e.clientX + 2;
    if (rawWidth < COLLAPSE_THRESHOLD) {
      if (!dragCollapsed) setDragCollapsed(true);
      return;
    }
    if (dragCollapsed) setDragCollapsed(false);
    const nextWidth = clamp(rawWidth, MIN_LEFT_SIDEBAR_WIDTH, MAX_LEFT_SIDEBAR_WIDTH);
    if (Math.abs(nextWidth - lastWidthRef.current) < 3) return;
    lastWidthRef.current = nextWidth;
    setAsideWidth(nextWidth);
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    setDragging(false);
    setDragCollapsed(false);
    // A plain click on the collapsed handle re-opens the sidebar
    const shouldCollapse = movedRef.current ? dragCollapsed : false;
    if (!!store.getState().app.sidebarCollapsed !== shouldCollapse) {
      dispatch(toggleSidebarCollapse());
    }
    setLocalStorageValue(SIDEBAR_COLLAPSED_KEY, shouldCollapse);
    if (!shouldCollapse) {
      dispatch(
        updateLeftSidebarWidth({
          leftSidebarWidth: asideWidth
        })
      );
      setLocalStorageValue(SIDEBAR_WIDTH_KEY, asideWidth);
    }
    dispatch(
      updateIsDragging({
        isDragging: false
      })
    );
  };
  const handleDragbarMouseDown = (e) => {
    e.preventDefault();
    movedRef.current = false;
    dragStartXRef.current = e.clientX;
    setDragCollapsed(!!sidebarCollapsed);
    setAsideWidth(leftSidebarWidth);
    lastWidthRef.current = leftSidebarWidth;
    setDragging(true);
    dispatch(
      updateIsDragging({
        isDragging: true
      })
    );
  };

  useEffect(() => {
    if (!dragging) return;
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dragging, asideWidth, dragCollapsed]);

  if (leftSidebarWidth === null || sidebarCollapsed === null) {
    return null;
  }

  return (
    <SidebarAccordionProvider defaultExpanded={['collections']}>
      <StyledWrapper className="flex relative h-full">
        <aside className="sidebar" data-testid="sidebar" style={{ width: currentWidth, transition: dragging ? 'none' : 'width 0.2s ease-in-out' }}>
          <div className="flex flex-row h-full w-full">
            <div className="flex flex-col w-full" style={{ width: displayWidth }}>
              <div className="flex flex-col flex-grow sidebar-sections-container" style={{ minHeight: 0, overflow: 'hidden' }}>
                <div className="sidebar-sections flex flex-col flex-1">
                  <SidebarContent
                    sections={sidebarSections}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div
          className={`absolute sidebar-drag-handle h-full${isCollapsed ? ' collapsed' : ''}`}
          data-testid="sidebar-drag-handle"
          data-tooltip-id="sidebar-drag-handle-tooltip"
          onMouseDown={handleDragbarMouseDown}
        >
          <div className="drag-request-border" />
        </div>
        {isCollapsed && !dragging && (
          <Tooltip
            id="sidebar-drag-handle-tooltip"
            className="tooltip-mod sidebar-handle-tooltip"
            place="right"
            positionStrategy="fixed"
            delayShow={300}
            noArrow
            opacity={1}
          >
            <div className="flex items-center justify-between gap-6" data-testid="sidebar-drag-handle-tooltip-title">
              <span>Show sidebar</span>
              <span className="shortcut">{getKeybindingDisplayText('collapseSidebar')}</span>
            </div>
            <div className="hint">Drag to resize</div>
          </Tooltip>
        )}
      </StyledWrapper>
    </SidebarAccordionProvider>
  );
};

export default Sidebar;
