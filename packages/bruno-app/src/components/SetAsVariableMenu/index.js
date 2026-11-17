import React from 'react';
import MenuDropdown from 'ui/MenuDropdown';
import { cursorAnchorStyle } from 'utils/common/cursorAnchor';

const SetAsVariableMenu = ({ selection, onNewVariable, onClose }) => (
  <MenuDropdown
    items={[{ id: 'new', label: 'Set as variable', onClick: onNewVariable }]}
    placement="bottom-start"
    opened={true}
    onChange={(isOpen) => !isOpen && onClose()}
    appendTo={document.body}
    data-testid="set-as-variable-menu"
  >
    <div style={cursorAnchorStyle(selection)} />
  </MenuDropdown>
);

export default SetAsVariableMenu;
