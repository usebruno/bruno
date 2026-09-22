import React from 'react';
import { isMacOS } from 'utils/common/platform';

const Keycap = ({ children }) => <span className="keycap">{children}</span>;

export const SelectShortcutHint = () => (
  <span className="shortcut">
    <Keycap>{isMacOS() ? '⌘' : 'Ctrl'}</Keycap>
    <span>+Click</span>
  </span>
);

export const SelectAllShortcutHint = () => (
  <span className="shortcut">
    <Keycap>{isMacOS() ? '⌘' : 'Ctrl'}</Keycap>
    <Keycap>A</Keycap>
  </span>
);

export const DeleteShortcutHint = () =>
  isMacOS() ? (
    <span className="shortcut">
      <Keycap>⌘</Keycap>
      <Keycap>⌦</Keycap>
    </span>
  ) : (
    <span className="shortcut">
      <Keycap>Delete</Keycap>
    </span>
  );
