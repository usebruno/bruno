import React, { useRef, forwardRef } from 'react';
import {
  IconCaretDown,
  IconForms,
  IconBraces,
  IconCode,
  IconFileText,
  IconDatabase,
  IconFile,
  IconX
} from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { humanizeRequestBodyMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const DEFAULT_MODES = [
  { key: 'multipartForm', label: 'Multipart Form', category: 'Form', icon: IconForms },
  { key: 'formUrlEncoded', label: 'Form URL Encoded', category: 'Form', icon: IconForms },
  { key: 'json', label: 'JSON', category: 'Raw', icon: IconBraces },
  { key: 'xml', label: 'XML', category: 'Raw', icon: IconCode },
  { key: 'text', label: 'TEXT', category: 'Raw', icon: IconFileText },
  { key: 'sparql', label: 'SPARQL', category: 'Raw', icon: IconDatabase },
  { key: 'file', label: 'File / Binary', category: 'Other', icon: IconFile },
  { key: 'none', label: 'No Body', category: 'Other', icon: IconX }
];

const BodyModeSelector = ({
  currentMode,
  onModeChange,
  modes = DEFAULT_MODES,
  disabled = false,
  className = '',
  wrapperClassName = '',
  showCategories = true,
  placement = 'bottom-end'
}) => {
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center pl-3 py-1 select-none selected-body-mode">
        {humanizeRequestBodyMode(currentMode)}
        {' '}
        <IconCaretDown className="caret ml-2" size={14} strokeWidth={2} />
      </div>
    );
  });

  const onModeSelect = (mode) => {
    dropdownTippyRef.current.hide();
    onModeChange(mode);
  };

  // Group modes by category for rendering
  const groupedModes = modes.reduce((acc, mode) => {
    const category = mode.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(mode);
    return acc;
  }, {});

  return (
    <StyledWrapper className={wrapperClassName}>
      <div className={`inline-flex items-center body-mode-selector ${disabled ? 'cursor-default' : 'cursor-pointer'}`}>
        <Dropdown
          onCreate={onDropdownCreate}
          icon={<Icon />}
          placement={placement}
          disabled={disabled}
          className={className}
        >
          {Object.entries(groupedModes).map(([category, categoryModes]) => (
            <React.Fragment key={category}>
              {showCategories && <div className="label-item">{category}</div>}
              {categoryModes.map((mode) => {
                const ModeIcon = mode.icon;
                return (
                  <div
                    key={mode.key}
                    className="dropdown-item"
                    onClick={() => onModeSelect(mode.key)}
                  >
                    {ModeIcon && (
                      <span className="dropdown-icon">
                        <ModeIcon size={16} strokeWidth={2} />
                      </span>
                    )}
                    {mode.label}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};

export default BodyModeSelector;
