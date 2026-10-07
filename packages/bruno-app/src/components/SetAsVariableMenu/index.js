import React from 'react';
import MenuDropdown from 'ui/MenuDropdown';

const anchorStyle = (selection) => ({
  position: 'fixed',
  left: `${selection.x}px`,
  top: `${selection.y}px`,
  width: '1px',
  height: '1px',
  pointerEvents: 'none'
});

const SetAsVariableMenu = ({ selection, onNewVariable, onClose }) => (
  <MenuDropdown
    items={[{ id: 'new', label: 'Set as variable', onClick: onNewVariable }]}
    placement="bottom-start"
    opened={true}
    onChange={(isOpen) => !isOpen && onClose()}
    appendTo={document.body}
    data-testid="set-as-variable-menu"
  >
    <div style={anchorStyle(selection)} />
  </MenuDropdown>
);

export default SetAsVariableMenu;
