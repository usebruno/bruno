import React, { useRef, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from '../Dropdown';
import StyledWrapper from './StyledWrapper';
import SaveRequestButton from '../SaveRequest';

const QueryUrl = ({value, onChange, handleRun, collections}) => {
  const dropdownTippyRef = useRef();
  const viewProfile = () => {};

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center pl-3 py-2 select-none">
        GET <IconCaretDown className="caret ml-2 mr-1" size={14} strokeWidth={2}/>
      </div>
    );
  });

  const onDropdownCreate = (ref) => dropdownTippyRef.current = ref;

  return (
    <StyledWrapper className="mt-3 flex items-center">
      <div className="flex items-center cursor-pointer user-action-dropdown h-full method-selector pr-3">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement='bottom-start'>
          <div>
            <div className="dropdown-item" onClick={() => {
              dropdownTippyRef.current.hide();
              viewProfile();
            }}>
              GET
            </div>
          </div>
          <div>
            <div className="dropdown-item" onClick={() => {
              dropdownTippyRef.current.hide();
              viewProfile();
            }}>
              POST
            </div>
          </div>
          <div>
            <div className="dropdown-item" onClick={() => {
              dropdownTippyRef.current.hide();
              viewProfile();
            }}>
              PUT
            </div>
          </div>
          <div>
            <div className="dropdown-item" onClick={() => {
              dropdownTippyRef.current.hide();
              viewProfile();
            }}>
              DELETE
            </div>
          </div>
          <div>
            <div className="dropdown-item" onClick={() => {
              dropdownTippyRef.current.hide();
              viewProfile();
            }}>
              PATCH
            </div>
          </div>
          <div>
            <div className="dropdown-item" onClick={() => {
              dropdownTippyRef.current.hide();
              viewProfile();
            }}>
              OPTIONS
            </div>
          </div>
          <div>
            <div className="dropdown-item" onClick={() => {
              dropdownTippyRef.current.hide();
              viewProfile();
            }}>
              HEAD
            </div>
          </div>
        </Dropdown>
      </div>
      <div className="flex items-center flex-grow input-container h-full">
        <input
          className="px-3 w-full mousetrap"
          type="text" defaultValue={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <button
        style={{backgroundColor: 'var(--color-brand)'}}
        className="flex items-center h-full text-white active:bg-blue-600 font-bold text-xs px-4 py-2 ml-2 uppercase rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
        onClick={handleRun}
      >
        <span style={{marginLeft: 5}}>Send</span>
      </button>
      <SaveRequestButton folders={collections}/>
    </StyledWrapper>
  )
};

QueryUrl.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  handleRun: PropTypes.func.isRequired
};

export default QueryUrl;
