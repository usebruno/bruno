import React from 'react';
import { IconCommand, IconBackspace } from '@tabler/icons';
import { isMacOS } from 'utils/common/platform';
import StyledWrapper from './StyledWrapper';

const ShortcutHint = ({ keys }) => (
  <StyledWrapper>
    {keys.map((key, index) => (
      <span className="keycap" key={index}>
        {key}
      </span>
    ))}
  </StyledWrapper>
);

const commandKey = <IconCommand size={13} strokeWidth={2} />;
const backspaceKey = <IconBackspace size={13} strokeWidth={2} />;

export const SelectAllShortcutHint = () => (
  <ShortcutHint keys={isMacOS() ? [commandKey, 'A'] : ['Ctrl+A']} />
);

export const DeleteShortcutHint = () => (
  <ShortcutHint keys={isMacOS() ? [commandKey, backspaceKey] : ['Del']} />
);
