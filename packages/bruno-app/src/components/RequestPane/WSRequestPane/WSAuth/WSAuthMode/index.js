import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { useDispatch } from 'react-redux';
import { updateRequestAuthMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestAuthMode } from 'utils/collections';
import StyledWrapper from '../../../Auth/AuthMode/StyledWrapper';

const WSAuthMode = ({ item, collection }) => {
  const { t } = useTranslation();
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
      label: t('REQUEST_PANE.BASIC_AUTH'),
      onClick: () => onModeChange('basic')
    },
    {
      id: 'bearer',
      label: t('REQUEST_PANE.BEARER_TOKEN'),
      onClick: () => onModeChange('bearer')
    },
    {
      id: 'apikey',
      label: t('REQUEST_PANE.API_KEY'),
      onClick: () => onModeChange('apikey')
    },
    {
      id: 'oauth2',
      label: t('REQUEST_PANE.OAUTH_2_0'),
      onClick: () => onModeChange('oauth2')
    },
    {
      id: 'inherit',
      label: t('REQUEST_PANE.INHERIT'),
      onClick: () => onModeChange('inherit')
    },
    {
      id: 'none',
      label: t('REQUEST_PANE.NO_AUTH'),
      onClick: () => onModeChange('none')
    }
  ], [onModeChange, t]);

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
