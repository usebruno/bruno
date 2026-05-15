import React, { useMemo, useCallback } from 'react';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateCollectionAuthMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestAuthMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const AuthMode = ({ collection }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const authMode = collection.draft?.root ? get(collection, 'draft.root.request.auth.mode') : get(collection, 'root.request.auth.mode');

  const onModeChange = useCallback((value) => {
    dispatch(
      updateCollectionAuthMode({
        collectionUid: collection.uid,
        mode: value
      })
    );
  }, [dispatch, collection.uid]);

  const menuItems = useMemo(() => [
    {
      id: 'awsv4',
      label: t('COLLECTION_AUTH.MODE_AWS_V4'),
      onClick: () => onModeChange('awsv4')
    },
    {
      id: 'basic',
      label: t('COLLECTION_AUTH.MODE_BASIC'),
      onClick: () => onModeChange('basic')
    },
    {
      id: 'wsse',
      label: t('COLLECTION_AUTH.MODE_WSSE'),
      onClick: () => onModeChange('wsse')
    },
    {
      id: 'bearer',
      label: t('COLLECTION_AUTH.MODE_BEARER'),
      onClick: () => onModeChange('bearer')
    },
    {
      id: 'digest',
      label: t('COLLECTION_AUTH.MODE_DIGEST'),
      onClick: () => onModeChange('digest')
    },
    {
      id: 'ntlm',
      label: t('COLLECTION_AUTH.MODE_NTLM'),
      onClick: () => onModeChange('ntlm')
    },
    {
      id: 'oauth1',
      label: t('COLLECTION_AUTH.MODE_OAUTH1'),
      onClick: () => onModeChange('oauth1')
    },
    {
      id: 'oauth2',
      label: t('COLLECTION_AUTH.MODE_OAUTH2'),
      onClick: () => onModeChange('oauth2')
    },
    {
      id: 'apikey',
      label: t('COLLECTION_AUTH.MODE_API_KEY'),
      onClick: () => onModeChange('apikey')
    },
    {
      id: 'none',
      label: t('COLLECTION_AUTH.MODE_NONE'),
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
        >
          <div className="flex items-center justify-center auth-mode-label select-none">
            {humanizeRequestAuthMode(authMode, t)} <IconCaretDown className="caret ml-1" size={14} strokeWidth={2} />
          </div>
        </MenuDropdown>
      </div>
    </StyledWrapper>
  );
};
export default AuthMode;
