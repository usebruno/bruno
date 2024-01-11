import React, { useRef, forwardRef } from 'react';
import get from 'lodash/get';
import Dropdown from 'components/Dropdown';
import { useDispatch } from 'react-redux';
import { updateRequestAuthMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestAuthMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { ChevronDown } from 'lucide-react';
import { DropdownItem } from 'components/Dropdown/DropdownItem/dropdown_item';

const AuthMode = ({ item, collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center auth-mode-label select-none">
        {humanizeRequestAuthMode(authMode)} <ChevronDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const onModeChange = (value) => {
    dispatch(
      updateRequestAuthMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: value
      })
    );
  };

  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer auth-mode-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div className="flex flex-col px-1">
            <DropdownItem
              active={authMode === 'awsv4'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('awsv4');
              }}
            >
              AWS Sig v4
            </DropdownItem>
            <DropdownItem
              active={authMode === 'basic'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('basic');
              }}
            >
              Basic Auth
            </DropdownItem>
            <DropdownItem
              active={authMode === 'bearer'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('bearer');
              }}
            >
              Bearer Token
            </DropdownItem>
            <DropdownItem
              active={authMode === 'digest'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('digest');
              }}
            >
              Digest Auth
            </DropdownItem>
            <DropdownItem
              warning={authMode === 'none'}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange('none');
              }}
            >
              No Auth
            </DropdownItem>
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default AuthMode;
