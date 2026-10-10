import React from 'react';
import styled from 'styled-components';
import { IconCommand, IconBackspace } from '@tabler/icons';
import { isMacOS } from 'utils/common/platform';

// Rendered inside MenuDropdown's `shortcut` slot (<kbd className="dropdown-shortcut">),
// which already supplies the muted color; keycaps just inherit it.
const Shortcut = styled.span`
  display: flex;
  align-items: center;
  font-size: 12px;
`;

const Keycap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 12px;
  height: 15px;
  font-size: 12px;
  line-height: 1;
`;

const CommandKeyIcon = () => <IconCommand size={13} strokeWidth={2} />;

export const SelectAllShortcutHint = () => (
  <Shortcut>
    <Keycap>{isMacOS() ? <CommandKeyIcon /> : 'Ctrl'}</Keycap>
    <Keycap>A</Keycap>
  </Shortcut>
);

export const DeleteShortcutHint = () =>
  isMacOS() ? (
    <Shortcut>
      <Keycap><CommandKeyIcon /></Keycap>
      <Keycap><IconBackspace size={13} strokeWidth={2} /></Keycap>
    </Shortcut>
  ) : (
    <Shortcut>
      <Keycap>Delete</Keycap>
    </Shortcut>
  );
