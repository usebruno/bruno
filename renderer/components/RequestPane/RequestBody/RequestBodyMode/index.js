import React, { useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';

const RequestBodyMode = () => {
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => dropdownTippyRef.current = ref;

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center pl-3 py-1 select-none">
        JSON <IconCaretDown className="caret ml-2 mr-2" size={14} strokeWidth={2}/>
      </div>
    );
  });

  return(
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer body-mode-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement='bottom-start'>
          <div className="label-item font-medium">
            Form
          </div>
          <div className="dropdown-item" onClick={() => {
            dropdownTippyRef.current.hide();
          }}>
            Multipart Form
          </div>
          <div className="dropdown-item" onClick={() => {
            dropdownTippyRef.current.hide();
          }}>
            Form Url Encoded
          </div>
          <div className="label-item font-medium">
            Raw
          </div>
          <div className="dropdown-item" onClick={() => {
            dropdownTippyRef.current.hide();
          }}>
            JSON
          </div>
          <div className="dropdown-item" onClick={() => {
            dropdownTippyRef.current.hide();
          }}>
            XML
          </div>
          <div className="dropdown-item" onClick={() => {
            dropdownTippyRef.current.hide();
          }}>
            TEXT
          </div>
          <div className="label-item font-medium">
            Other
          </div>
          <div className="dropdown-item" onClick={() => {
            dropdownTippyRef.current.hide();
          }}>
            No Body
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default RequestBodyMode;
