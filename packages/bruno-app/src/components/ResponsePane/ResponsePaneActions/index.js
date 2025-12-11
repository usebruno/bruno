import React, { useState, useEffect, useRef, forwardRef, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import styled from 'styled-components';
import { IconDots, IconDownload, IconEraser, IconBookmark, IconCopy, IconLayoutColumns, IconLayoutRows } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import ResponseDownload from '../ResponseDownload';
import ResponseBookmark from '../ResponseBookmark';
import ResponseClear from '../ResponseClear';
import ResponseLayoutToggle, { useResponseLayoutToggle } from '../ResponseLayoutToggle';
import ResponseCopy from '../ResponseCopy/index';
import StyledWrapper from '../StyledWrapper';

const PADDING = 48;

const StyledMenuIcon = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1.25rem;
  width: 1.5rem;
  border: 1px solid ${(props) => props.theme.workspace.border};
  color: ${(props) => props.theme.codemirror.variable.info.iconColor};
  border-radius: 4px;

  &:hover {
    background-color: ${(props) => props.theme.workspace.button.bg};
    color: ${(props) => props.theme.text};
  }
`;

const MenuIcon = forwardRef((props, ref) => (
  <StyledMenuIcon
    ref={ref}
    title="More actions"
    {...props}
  >
    <IconDots size={16} strokeWidth={1.5} />
  </StyledMenuIcon>
));

MenuIcon.displayName = 'MenuIcon';

const ResponsePaneActions = ({ item, collection, responseSize }) => {
  const { orientation } = useResponseLayoutToggle();
  const [showMenu, setShowMenu] = useState(false);
  const actionsRef = useRef(null);
  const dropdownTippyRef = useRef();
  const individualButtonsWidthRef = useRef(null);
  const showMenuRef = useRef(showMenu);

  const checkSpace = useCallback(() => {
    const actionsContainer = actionsRef.current?.parentElement;
    const rightSideContainer = actionsContainer?.closest('.right-side-container');

    if (!actionsContainer || !rightSideContainer) return;

    const currentActionsWidth = actionsContainer.offsetWidth || 0;

    // Store individual buttons width when they're visible
    if (!showMenuRef.current && currentActionsWidth > 0) {
      individualButtonsWidthRef.current = currentActionsWidth;
    }

    // Calculate siblings total width
    let siblingsTotalWidth = 0;
    let sibling = actionsContainer.previousElementSibling;
    while (sibling) {
      siblingsTotalWidth += sibling.offsetWidth || 0;
      sibling = sibling.previousElementSibling;
    }

    const actionsWidth = individualButtonsWidthRef.current || currentActionsWidth;
    const requiredWidth = actionsWidth + siblingsTotalWidth + PADDING;
    const shouldShowMenu = rightSideContainer.offsetWidth < requiredWidth;

    if (showMenuRef.current !== shouldShowMenu) {
      showMenuRef.current = shouldShowMenu;
      setShowMenu(shouldShowMenu);
    }
  }, []);

  const debouncedCheckSpace = useMemo(
    () => debounce(checkSpace, 50),
    [checkSpace]
  );

  useEffect(() => {
    showMenuRef.current = showMenu;
  }, [showMenu]);

  useEffect(() => {
    checkSpace();

    const rightSideContainer = actionsRef.current?.closest('.right-side-container');
    if (!rightSideContainer) return;

    const resizeObserver = new ResizeObserver(debouncedCheckSpace);
    resizeObserver.observe(rightSideContainer);

    return () => {
      resizeObserver.disconnect();
      debouncedCheckSpace.cancel();
    };
  }, [item, debouncedCheckSpace]);

  const onDropdownCreate = (ref) => {
    dropdownTippyRef.current = ref;
  };

  const closeDropdown = () => {
    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
  };

  if (item.type !== 'http-request') {
    return null;
  }

  return (
    <StyledWrapper ref={actionsRef} className="flex items-center gap-2">
      {showMenu ? (
        <Dropdown onCreate={onDropdownCreate} icon={<MenuIcon data-testid="response-actions-menu" />} placement="bottom-end">

          {/* Response Copy */}
          <ResponseCopy item={item}>
            <div className="dropdown-item" onClick={closeDropdown}>
              <span className="dropdown-icon">
                <IconCopy size={16} strokeWidth={1.5} />
              </span>
              <span>Copy response</span>
            </div>
          </ResponseCopy>

          {/* Response Save as Example */}
          <ResponseBookmark item={item} collection={collection} responseSize={responseSize}>
            <div className="dropdown-item" onClick={closeDropdown}>
              <span className="dropdown-icon">
                <IconBookmark size={16} strokeWidth={1.5} />
              </span>
              <span>Save response</span>
            </div>
          </ResponseBookmark>

          {/* Response Download */}
          <ResponseDownload item={item}>
            <div className="dropdown-item" onClick={closeDropdown}>
              <span className="dropdown-icon">
                <IconDownload size={16} strokeWidth={1.5} />
              </span>
              Download response
            </div>
          </ResponseDownload>

          {/* Response Clear */}
          <ResponseClear item={item} collection={collection}>
            <div className="dropdown-item" onClick={closeDropdown}>
              <span className="dropdown-icon">
                <IconEraser size={16} strokeWidth={1.5} />
              </span>
              Clear response
            </div>
          </ResponseClear>

          {/* Response Layout Toggle */}
          <ResponseLayoutToggle>
            <div className="dropdown-item" onClick={closeDropdown}>
              <span className="dropdown-icon">
                {orientation === 'horizontal' ? <IconLayoutColumns size={16} strokeWidth={1.5} /> : <IconLayoutRows size={16} strokeWidth={1.5} />}
              </span>
              <span>Change layout</span>
            </div>
          </ResponseLayoutToggle>
        </Dropdown>
      ) : (
        <div className="flex items-center gap-[2px]">
          <ResponseCopy item={item} />
          <ResponseBookmark item={item} collection={collection} responseSize={responseSize} />
          <ResponseDownload item={item} />
          <ResponseClear item={item} collection={collection} />
          <ResponseLayoutToggle />
        </div>
      )}
    </StyledWrapper>
  );
};

export default ResponsePaneActions;
