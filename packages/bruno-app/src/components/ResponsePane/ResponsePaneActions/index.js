import React, { useRef, forwardRef } from 'react';
import styled from 'styled-components';
import { IconDots, IconDownload, IconEraser, IconBookmark, IconCopy, IconLayoutColumns, IconLayoutRows } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
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
  const dropdownTippyRef = useRef();

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
    <StyledWrapper className="response-pane-actions-wrapper">
      <div className="actions-dropdown">
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
                {orientation === 'vertical' ? <IconLayoutColumns size={16} strokeWidth={1.5} /> : <IconLayoutRows size={16} strokeWidth={1.5} />}
              </span>
              <span>Change layout</span>
            </div>
          </ResponseLayoutToggle>
        </Dropdown>
      </div>
      <div className="actions-buttons flex items-center gap-[2px]">
        <ResponseCopy item={item} />
        <ResponseBookmark item={item} collection={collection} responseSize={responseSize} />
        <ResponseDownload item={item} />
        <ResponseClear item={item} collection={collection} />
        <ResponseLayoutToggle />
      </div>

    </StyledWrapper>
  );
};

export default ResponsePaneActions;
