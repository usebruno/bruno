import React, { useRef, forwardRef } from 'react';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { useDispatch } from 'react-redux';
import { updateCollectionAuthMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestAuthMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const AuthMode = ({ collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const authMode = get(collection, 'root.request.auth.mode');

  const authModes = ['awsv4', 'basic', 'bearer', 'digest', 'ntlm', 'oauth1', 'oauth2', 'wsse', 'apikey', 'none'];

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center auth-mode-label select-none">
        {humanizeRequestAuthMode(authMode)} <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const onModeChange = (value) => {
    dispatch(
      updateCollectionAuthMode({
        collectionUid: collection.uid,
        mode: value
      })
    );
  };

  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer auth-mode-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          {authModes.map((mode) => {
            return (
              <>
                <div
                  className="dropdown-item"
                  onClick={() => {
                    dropdownTippyRef.current.hide();
                    onModeChange(mode);
                  }}
                >
                  {humanizeRequestAuthMode(mode)}
                </div>
              </>
            );
          })}
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default AuthMode;
