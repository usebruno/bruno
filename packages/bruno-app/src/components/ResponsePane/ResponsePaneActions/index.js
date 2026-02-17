import React, { forwardRef, useRef } from 'react';
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
  color: ${(props) => props.theme.dropdown.iconColor};
  border-radius: 4px;

  &:hover {
    border-color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.hoverBorder} !important;
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

const ResponsePaneActions = ({ item, collection, responseSize, selectedFormat, selectedTab, data, dataBuffer }) => {
  const { orientation } = useResponseLayoutToggle();

  // Refs to access child component imperative handles (click, isDisabled)
  const bookmarkButtonRef = useRef(null);
  const downloadButtonRef = useRef(null);
  const clearButtonRef = useRef(null);
  const copyButtonRef = useRef(null);
  const layoutToggleButtonRef = useRef(null);

  /**
   * GQL response actions missing with Save response - because their is schema validation missing for saving GQL response will undo once example
   * scehem is updated
   */
  const gqlMenuItems = [
    {
      id: 'copy-response',
      label: 'Copy response',
      leftSection: IconCopy,
      get disabled() {
        return copyButtonRef.current?.isDisabled ?? false;
      },
      onClick: () => copyButtonRef.current?.click()
    },
    {
      id: 'download-response',
      label: 'Download response',
      leftSection: IconDownload,
      get disabled() {
        return downloadButtonRef.current?.isDisabled ?? false;
      },
      onClick: () => downloadButtonRef.current?.click()
    },
    {
      id: 'clear-response',
      label: 'Clear response',
      leftSection: IconEraser,
      get disabled() {
        return clearButtonRef.current?.isDisabled ?? false;
      },
      onClick: () => clearButtonRef.current?.click()
    },
    {
      id: 'change-layout',
      label: 'Change layout',
      leftSection: orientation === 'vertical' ? IconLayoutColumns : IconLayoutRows,
      get disabled() {
        return layoutToggleButtonRef.current?.isDisabled ?? false;
      },
      onClick: () => layoutToggleButtonRef.current?.click()
    }
  ];

  const menuItems = [
    {
      id: 'copy-response',
      label: 'Copy response',
      leftSection: IconCopy,
      get disabled() {
        return copyButtonRef.current?.isDisabled ?? false;
      },
      onClick: () => copyButtonRef.current?.click()
    },
    {
      id: 'save-response',
      label: 'Save response',
      leftSection: IconBookmark,
      get disabled() {
        return bookmarkButtonRef.current?.isDisabled ?? false;
      },
      onClick: () => bookmarkButtonRef.current?.click()
    },
    {
      id: 'download-response',
      label: 'Download response',
      leftSection: IconDownload,
      get disabled() {
        return downloadButtonRef.current?.isDisabled ?? false;
      },
      onClick: () => downloadButtonRef.current?.click()
    },
    {
      id: 'clear-response',
      label: 'Clear response',
      leftSection: IconEraser,
      get disabled() {
        return clearButtonRef.current?.isDisabled ?? false;
      },
      onClick: () => clearButtonRef.current?.click()
    },
    {
      id: 'change-layout',
      label: 'Change layout',
      leftSection: orientation === 'vertical' ? IconLayoutColumns : IconLayoutRows,
      get disabled() {
        return layoutToggleButtonRef.current?.isDisabled ?? false;
      },
      onClick: () => layoutToggleButtonRef.current?.click()
    }
  ];

  if (!['http-request', 'graphql-request'].includes(item.type)) {
    return null;
  }

  return (
    <StyledWrapper className="response-pane-actions-wrapper">
      <div className="actions-dropdown">
        <MenuDropdown
          items={item.type !== 'graphql-request' ? menuItems : gqlMenuItems}
          placement="bottom-end"
          data-testid="response-actions-menu"
        >
          <MenuIcon />
        </MenuDropdown>
      </div>
      <div className="actions-buttons flex items-center gap-[2px]">
        <ResponseCopy
          ref={copyButtonRef}
          item={item}
          selectedFormat={selectedFormat}
          selectedTab={selectedTab}
          data={data}
          dataBuffer={dataBuffer}
        />
        {item.type !== 'graphql-request' && <ResponseBookmark ref={bookmarkButtonRef} item={item} collection={collection} responseSize={responseSize} />}
        <ResponseDownload ref={downloadButtonRef} item={item} />
        <ResponseClear ref={clearButtonRef} item={item} collection={collection} />
        <ResponseLayoutToggle ref={layoutToggleButtonRef} />
      </div>
    </StyledWrapper>
  );
};

export default ResponsePaneActions;
