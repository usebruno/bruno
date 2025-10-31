import React, { useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { humanizeRequestBodyMode } from 'utils/collections';

const DEFAULT_MODES = [
  { key: 'multipartForm', label: 'Multipart Form', category: 'Form' },
  { key: 'formUrlEncoded', label: 'Form URL Encoded', category: 'Form' },
  { key: 'json', label: 'JSON', category: 'Raw' },
  { key: 'xml', label: 'XML', category: 'Raw' },
  { key: 'text', label: 'TEXT', category: 'Raw' },
  { key: 'sparql', label: 'SPARQL', category: 'Raw' },
  { key: 'file', label: 'File / Binary', category: 'Other' },
  { key: 'none', label: 'None', category: 'Other' }
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
    <div className={`inline-flex items-center body-mode-selector ${disabled ? 'cursor-default' : 'cursor-pointer'} ${wrapperClassName}`}>
      <Dropdown
        onCreate={onDropdownCreate}
        icon={<Icon />}
        placement={placement}
        disabled={disabled}
        className={className}
      >
        {Object.entries(groupedModes).map(([category, categoryModes]) => (
          <React.Fragment key={category}>
            {showCategories && <div className="label-item font-medium">{category}</div>}
            {categoryModes.map((mode) => (
              <div
                key={mode.key}
                className="dropdown-item"
                onClick={() => onModeSelect(mode.key)}
              >
                {mode.label}
              </div>
            ))}
          </React.Fragment>
        ))}
      </Dropdown>
    </div>
  );
};

export default BodyModeSelector;
