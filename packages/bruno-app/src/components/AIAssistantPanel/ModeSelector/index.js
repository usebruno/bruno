import React from 'react';
import { IconMessage, IconBolt, IconEye, IconChevronDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import StyledWrapper from './StyledWrapper';

const AI_MODES = [
  {
    id: 'ask',
    label: 'Ask',
    description: 'Questions only',
    icon: IconMessage
  },
  {
    id: 'auto-accept',
    label: 'Auto',
    description: 'Apply automatically',
    icon: IconBolt
  },
  {
    id: 'ask-before-edit',
    label: 'Review',
    description: 'Review before applying',
    icon: IconEye
  }
];

const ModeSelector = ({ currentMode, onModeChange, disabled }) => {
  const currentModeConfig = AI_MODES.find((m) => m.id === currentMode) || AI_MODES[2];
  const Icon = currentModeConfig?.icon || IconEye;

  const items = AI_MODES.map((mode) => ({
    id: mode.id,
    label: mode.label,
    leftSection: mode.icon,
    onClick: () => onModeChange(mode.id)
  }));

  return (
    <StyledWrapper>
      <MenuDropdown
        items={items}
        selectedItemId={currentMode}
        placement="bottom-start"
      >
        <button className="mode-trigger" disabled={disabled}>
          <Icon size={12} className="mode-icon" />
          <span>{currentModeConfig?.label}</span>
          <IconChevronDown size={10} className="chevron" />
        </button>
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default ModeSelector;
