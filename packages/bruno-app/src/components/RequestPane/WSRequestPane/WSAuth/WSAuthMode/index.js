import React, { useMemo, useCallback } from 'react';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { useDispatch } from 'react-redux';
import { updateRequestAuthMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestAuthMode } from 'utils/collections';
import StyledWrapper from '../../../Auth/AuthMode/StyledWrapper';

const WSAuthMode = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const onModeChange = useCallback((value) => {
    dispatch(updateRequestAuthMode({
      itemUid: item.uid,
      collectionUid: collection.uid,
      mode: value
    }));
  }, [dispatch, item.uid, collection.uid]);

  const menuItems = useMemo(() => [
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
      id: 'apikey',
      label: 'API Key',
      onClick: () => onModeChange('apikey')
    },
    {
      id: 'oauth2',
      label: 'OAuth2',
      onClick: () => onModeChange('oauth2')
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

export default WSAuthMode;
