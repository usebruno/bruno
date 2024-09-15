import React, { useRef, forwardRef } from 'react';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { useDispatch } from 'react-redux';
import { updateRequestAuthMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestAuthMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const AuthMode = ({ item, collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center auth-mode-label select-none">
        {humanizeRequestAuthMode(authMode)} <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
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
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              onModeChange('awsv4');
            }}
          >
            AWS Sig v4
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              onModeChange('basic');
            }}
          >
            Basic Auth
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              onModeChange('bearer');
            }}
          >
            Bearer Token
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              onModeChange('digest');
            }}
          >
            Digest Auth
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              onModeChange('oauth2');
            }}
          >
            OAuth 2.0
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              onModeChange('inherit');
            }}
          >
            Inherit
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              onModeChange('none');
            }}
          >
            No Auth
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default AuthMode;
