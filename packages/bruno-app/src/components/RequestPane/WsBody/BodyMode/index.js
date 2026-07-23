import React, { useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { humanizeRequestBodyMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const RAW_MODES = [
  {
    label: 'JSON',
    key: 'json'
  },
  {
    label: 'XML',
    key: 'xml'
  },
  {
    label: 'TEXT',
    key: 'text'
  }
];

const WSRequestBodyMode = ({ mode, onModeChange }) => {
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const Icon = forwardRef((props, ref) => {
    return (
      <div
        ref={ref}
        className="flex items-center justify-center pl-3 py-1 select-none selected-body-mode"
        data-testid="ws-body-mode-label"
      >
        {humanizeRequestBodyMode(mode)}
        {' '}
        <IconCaretDown className="caret ml-2" size={14} strokeWidth={2} />
      </div>
    );
  });

  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer body-mode-selector" data-testid="ws-body-mode-selector">
        <Dropdown
          onCreate={onDropdownCreate}
          icon={<Icon />}
          placement="bottom-end"
          appendTo={() => document.body}
        >
          <div className="label-item font-medium">Raw</div>
          {RAW_MODES.map((d) => (
            <div
              className="dropdown-item"
              data-testid={`ws-body-mode-item-${d.key}`}
              key={d.key}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange(d.key);
              }}
            >
              {d.label}
            </div>
          ))}
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default WSRequestBodyMode;
