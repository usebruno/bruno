import React, { useMemo, useCallback } from 'react';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { useDispatch } from 'react-redux';
import { updateFolderAuthMode } from 'providers/ReduxStore/slices/collections';
import { humanizeRequestAuthMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const AuthMode = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const authMode = folder.draft ? get(folder, 'draft.request.auth.mode') : get(folder, 'root.request.auth.mode');

  const onModeChange = useCallback((value) => {
    dispatch(
      updateFolderAuthMode({
        mode: value,
        collectionUid: collection.uid,
        folderUid: folder.uid
      })
    );
  }, [dispatch, collection.uid, folder.uid]);

  const menuItems = useMemo(() => [
    {
      id: 'awsv4',
      label: t('FOLDER_SETTINGS.AUTH_MODE_AWS_V4'),
      onClick: () => onModeChange('awsv4')
    },
    {
      id: 'basic',
      label: t('FOLDER_SETTINGS.AUTH_MODE_BASIC'),
      onClick: () => onModeChange('basic')
    },
    {
      id: 'bearer',
      label: t('FOLDER_SETTINGS.AUTH_MODE_BEARER'),
      onClick: () => onModeChange('bearer')
    },
    {
      id: 'digest',
      label: t('FOLDER_SETTINGS.AUTH_MODE_DIGEST'),
      onClick: () => onModeChange('digest')
    },
    {
      id: 'ntlm',
      label: t('FOLDER_SETTINGS.AUTH_MODE_NTLM'),
      onClick: () => onModeChange('ntlm')
    },
    {
      id: 'oauth1',
      label: t('FOLDER_SETTINGS.AUTH_MODE_OAUTH1'),
      onClick: () => onModeChange('oauth1')
    },
    {
      id: 'oauth2',
      label: t('FOLDER_SETTINGS.AUTH_MODE_OAUTH2'),
      onClick: () => onModeChange('oauth2')
    },
    {
      id: 'wsse',
      label: t('FOLDER_SETTINGS.AUTH_MODE_WSSE'),
      onClick: () => onModeChange('wsse')
    },
    {
      id: 'apikey',
      label: t('FOLDER_SETTINGS.AUTH_MODE_API_KEY'),
      onClick: () => onModeChange('apikey')
    },
    {
      id: 'inherit',
      label: t('FOLDER_SETTINGS.AUTH_MODE_INHERIT'),
      onClick: () => onModeChange('inherit')
    },
    {
      id: 'none',
      label: t('FOLDER_SETTINGS.AUTH_MODE_NONE'),
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
            {humanizeRequestAuthMode(authMode, t)} <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
          </div>
        </MenuDropdown>
      </div>
    </StyledWrapper>
  );
};

export default AuthMode;
