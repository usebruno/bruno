import React from 'react';
import classnames from 'classnames';
import { IconChecks } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import { isMacOS } from 'utils/common/platform';

const SelectModeButton = ({ isActive, onClick }) => (
  <ToolHint
    toolhintId="env-select-mode-toolhint"
    text={`Select environments — ${isMacOS() ? '⌘' : 'Ctrl'}-click rows to add more to the selection`}
    place="bottom"
  >
    <button
      type="button"
      className={classnames('btn-action', { 'btn-action-active': isActive })}
      onClick={onClick}
      aria-pressed={isActive}
      aria-label="Select environments"
      data-testid="env-select-mode-btn"
    >
      <IconChecks size={16} strokeWidth={1.5} />
    </button>
  </ToolHint>
);

export default SelectModeButton;
