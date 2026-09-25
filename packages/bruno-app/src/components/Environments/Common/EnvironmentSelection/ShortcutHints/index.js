import React from 'react';
import { IconCommand, IconBackspace } from '@tabler/icons';
import { isMacOS } from 'utils/common/platform';

const Keycap = ({ children }) => <span className="keycap">{children}</span>;

const CommandKeyIcon = () => <IconCommand size={13} strokeWidth={2} />;

export const SelectAllShortcutHint = () => (
  <span className="shortcut">
    <Keycap>{isMacOS() ? <CommandKeyIcon /> : 'Ctrl'}</Keycap>
    <Keycap>A</Keycap>
  </span>
);

export const DeleteShortcutHint = () =>
  isMacOS() ? (
    <span className="shortcut">
      <Keycap><CommandKeyIcon /></Keycap>
      <Keycap><IconBackspace size={13} strokeWidth={2} /></Keycap>
    </span>
  ) : (
    <span className="shortcut">
      <Keycap>Delete</Keycap>
    </span>
  );
