import React, { useMemo, forwardRef, useRef } from 'react';
import styled from 'styled-components';
import { IconDots, IconDownload, IconEraser, IconBookmark, IconCopy, IconLayoutColumns, IconLayoutRows } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import ResponseDownload from '../ResponseDownload';
import ResponseBookmark from '../ResponseBookmark';
import ResponseClear from '../ResponseClear';
import ResponseLayoutToggle, { useResponseLayoutToggle } from '../ResponseLayoutToggle';
import ResponseCopy from '../ResponseCopy/index';
import StyledWrapper from './StyledWrapper';

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

  // Refs to trigger actions on buttons
  const bookmarkButtonRef = useRef(null);
  const downloadButtonRef = useRef(null);
  const clearButtonRef = useRef(null);
  const copyButtonRef = useRef(null);
  const layoutToggleButtonRef = useRef(null);

  if (item.type !== 'http-request') {
    return null;
  }

  const menuItems = useMemo(() => {
    const items = [];

    // Response Copy
    items.push({
      id: 'copy-response',
      label: 'Copy response',
      leftSection: IconCopy,
      onClick: () => {
        // Trigger the ResponseCopy action via ref
        copyButtonRef.current?.click();
      }
    });

    // Response Save as Example
    items.push({
      id: 'save-response',
      label: 'Save response',
      leftSection: IconBookmark,
      onClick: () => {
        // Trigger the ResponseBookmark action via ref
        bookmarkButtonRef.current?.click();
      }
    });

    // Response Download
    items.push({
      id: 'download-response',
      label: 'Download response',
      leftSection: IconDownload,
      onClick: () => {
        // Trigger the ResponseDownload action via ref
        downloadButtonRef.current?.click();
      }
    });

    // Response Clear
    items.push({
      id: 'clear-response',
      label: 'Clear response',
      leftSection: IconEraser,
      onClick: () => {
        // Trigger the ResponseClear action via ref
        clearButtonRef.current?.click();
      }
    });

    // Response Layout Toggle
    items.push({
      id: 'change-layout',
      label: 'Change layout',
      leftSection: orientation === 'vertical' ? IconLayoutColumns : IconLayoutRows,
      onClick: () => {
        // Trigger the ResponseLayoutToggle action via ref
        layoutToggleButtonRef.current?.click();
      }
    });

    return items;
  }, [orientation]);

  return (
    <StyledWrapper className="response-pane-actions-wrapper">
      <div className="actions-dropdown">
        <MenuDropdown
          items={menuItems}
          placement="bottom-end"
          data-testid="response-actions-menu"
        >
          <MenuIcon />
        </MenuDropdown>
      </div>
      <div className="actions-buttons flex items-center gap-[2px]">
        <div ref={(el) => { copyButtonRef.current = el?.querySelector('[data-testid="response-copy-btn"]'); }}>
          <ResponseCopy item={item} />
        </div>

        <div ref={(el) => { bookmarkButtonRef.current = el?.querySelector('[data-testid="response-bookmark-btn"]'); }}>
          <ResponseBookmark item={item} collection={collection} responseSize={responseSize} />
        </div>
        <div ref={(el) => { downloadButtonRef.current = el?.querySelector('[data-testid="response-download-btn"]'); }}>
          <ResponseDownload item={item} />
        </div>
        <div ref={(el) => { clearButtonRef.current = el?.querySelector('[data-testid="response-clear-btn"]'); }}>
          <ResponseClear item={item} collection={collection} />
        </div>
        <div ref={(el) => { layoutToggleButtonRef.current = el?.querySelector('[data-testid="response-layout-toggle-btn"]'); }}>
          <ResponseLayoutToggle />
        </div>
      </div>

    </StyledWrapper>
  );
};

export default ResponsePaneActions;
