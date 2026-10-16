import React from 'react';
import { IconCommand, IconBackspace } from '@tabler/icons';
import { isMacOS } from 'utils/common/platform';
import StyledWrapper from './StyledWrapper';

const CommandKeyIcon = () => <IconCommand size={13} strokeWidth={2} />;

export const SelectAllShortcutHint = () => (
  <StyledWrapper>
    <span className="keycap">{isMacOS() ? <CommandKeyIcon /> : 'Ctrl'}</span>
    <span className="keycap">A</span>
  </StyledWrapper>
);

export const DeleteShortcutHint = () =>
  isMacOS() ? (
    <StyledWrapper>
      <span className="keycap"><CommandKeyIcon /></span>
      <span className="keycap"><IconBackspace size={13} strokeWidth={2} /></span>
    </StyledWrapper>
  ) : (
    <StyledWrapper>
      <span className="keycap">Del</span>
    </StyledWrapper>
  );
