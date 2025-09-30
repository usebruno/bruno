import React, { useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { humanizeRequestBodyMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const WSRequestBodyMode = ({ mode, onModeChange }) => {
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center pl-3 py-1 select-none selected-body-mode">
        {humanizeRequestBodyMode(mode)}
        {' '}
        <IconCaretDown className="caret ml-2" size={14} strokeWidth={2} />
      </div>
    );
  });

  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer body-mode-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div className="label-item font-medium">Raw</div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('json');
            }}
          >
            JSON
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('xml');
            }}
          >
            XML
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('text');
            }}
          >
            TEXT
          </div>
          {/* <div className="label-item font-medium">Other</div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              onModeChange('file');
            }}
          >
            File / Binary
          </div> */}
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default WSRequestBodyMode;
