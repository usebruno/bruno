import React from 'react';
import { IconDots } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';

const anchorStyle = (selection) => ({
  position: 'fixed',
  left: `${selection?.x || 0}px`,
  top: `${selection?.y || 0}px`,
  width: '1px',
  height: '1px',
  pointerEvents: 'none'
});

const SetAsVariableMenu = ({ selection, onNewVariable, onClose }) => (
  <Dropdown
    visible={true}
    placement="bottom-start"
    appendTo={document.body}
    onClickOutside={onClose}
    noPadding={true}
    icon={<div style={anchorStyle(selection)} />}
  >
    <StyledWrapper data-testid="set-as-variable-menu">
      <button type="button" className="var-set-bar" onClick={onNewVariable} data-testid="set-as-variable-new">
        <span className="var-set-bar-label">Set as variable</span>
        <span className="var-set-bar-separator" />
        <span className="var-set-bar-dots">
          <IconDots size={14} strokeWidth={1.5} />
        </span>
      </button>
    </StyledWrapper>
  </Dropdown>
);

export default SetAsVariableMenu;
