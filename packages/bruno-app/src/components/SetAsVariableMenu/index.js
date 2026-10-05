import React from 'react';
import Tippy from '@tippyjs/react';
import StyledWrapper from './StyledWrapper';

const anchorStyle = (selection) => ({
  position: 'fixed',
  left: `${selection.x}px`,
  top: `${selection.y}px`,
  width: '1px',
  height: '1px',
  pointerEvents: 'none'
});

const SetAsVariableMenu = ({ selection, onNewVariable, onClose }) => (
  <Tippy
    visible={true}
    interactive={true}
    placement="bottom-start"
    animation={false}
    arrow={false}
    appendTo={document.body}
    onClickOutside={onClose}
    render={(attrs) => (
      <StyledWrapper className="tippy-box" tabIndex={-1} data-testid="set-as-variable-menu" {...attrs}>
        <button type="button" className="var-set-bar" onClick={onNewVariable} data-testid="set-as-variable-new">
          Set as variable
        </button>
      </StyledWrapper>
    )}
  >
    <div style={anchorStyle(selection)} />
  </Tippy>
);

export default SetAsVariableMenu;
