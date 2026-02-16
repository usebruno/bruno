import React, { useMemo, useCallback } from 'react';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { useDispatch } from 'react-redux';
import { updateRequestAuthMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestAuthMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const AuthMode = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const onModeChange = useCallback((value) => {
    dispatch(
      updateRequestAuthMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: value
      })
    );
  }, [dispatch, item.uid, collection.uid]);

  const menuItems = useMemo(() => [
    {
      id: 'awsv4',
      label: 'AWS Sig v4',
      onClick: () => onModeChange('awsv4')
    },
    {
      id: 'basic',
      label: 'Basic Auth',
      onClick: () => onModeChange('basic')
    },
    {
      id: 'bearer',
      label: 'Bearer Token',
      onClick: () => onModeChange('bearer')
    },
    {
      id: 'digest',
      label: 'Digest Auth',
      onClick: () => onModeChange('digest')
    },
    {
      id: 'ntlm',
      label: 'NTLM Auth',
      onClick: () => onModeChange('ntlm')
    },
    {
      id: 'oauth2',
      label: 'OAuth 2.0',
      onClick: () => onModeChange('oauth2')
    },
    {
      id: 'wsse',
      label: 'WSSE Auth',
      onClick: () => onModeChange('wsse')
    },
    {
      id: 'apikey',
      label: 'API Key',
      onClick: () => onModeChange('apikey')
    },
    {
      id: 'inherit',
      label: 'Inherit',
      onClick: () => onModeChange('inherit')
    },
    {
      id: 'none',
      label: 'No Auth',
      onClick: () => onModeChange('none')
    }
  ], [onModeChange]);

  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer auth-mode-selector">
        <MenuDropdown
          items={menuItems}
          placement="bottom-end"
          selectedItemId={authMode}
          showTickMark={true}
        >
          <div className="flex items-center justify-center auth-mode-label select-none">
            {humanizeRequestAuthMode(authMode)} <IconCaretDown className="caret ml-1" size={14} strokeWidth={2} />
          </div>
        </MenuDropdown>
      </div>
    </StyledWrapper>
  );
};
export default AuthMode;
