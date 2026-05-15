import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import get from 'lodash/get';
import { IconTag } from '@tabler/icons';
import { useTranslation } from 'react-i18next';
import ToggleSelector from 'components/RequestPane/Settings/ToggleSelector';
import SettingsInput from 'components/SettingsInput';
import InheritableSettingsInput from 'components/InheritableSettingsInput';
import { updateItemSettings } from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import Tags from './Tags/index';

// Default settings configuration
const DEFAULT_SETTINGS = {
  encodeUrl: false,
  followRedirects: true,
  maxRedirects: 5,
  timeout: 'inherit'
};

const Settings = ({ item, collection }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // Get current settings with defaults applied
  const getPropertyFromDraftOrRequest = (propertyKey) =>
    item.draft ? get(item, `draft.${propertyKey}`, {}) : get(item, propertyKey, {});

  const rawSettings = getPropertyFromDraftOrRequest('settings');
  const settings = { ...DEFAULT_SETTINGS, ...rawSettings };
  const { encodeUrl, followRedirects, maxRedirects, timeout } = settings;

  // Reusable function to update settings
  const updateSetting = useCallback((settingUpdate) => {
    const updatedSettings = { ...settings, ...settingUpdate };
    dispatch(updateItemSettings({
      collectionUid: collection.uid,
      itemUid: item.uid,
      settings: updatedSettings
    }));
  }, [dispatch, collection.uid, item.uid, settings]);

  // Setting change handlers
  const onToggleUrlEncoding = useCallback(() =>
    updateSetting({ encodeUrl: !encodeUrl }), [encodeUrl, updateSetting]);

  const onToggleFollowRedirects = useCallback(() =>
    updateSetting({ followRedirects: !followRedirects }), [followRedirects, updateSetting]);

  const onMaxRedirectsChange = useCallback((e) => {
    const value = e.target.value;
    // Only allow empty string or digits
    if (value === '' || /^\d+$/.test(value)) {
      const numericValue = value === '' ? 0 : parseInt(value, 10);
      updateSetting({ maxRedirects: numericValue });
    }
  }, [updateSetting]);

  const onTimeoutChange = useCallback((e) => {
    const value = e.target.value;
    // Only allow empty string or digits
    if (value === '' || /^\d+$/.test(value)) {
      const numericValue = value === '' ? 0 : parseInt(value, 10);
      updateSetting({ timeout: numericValue });
    }
  }, [updateSetting]);

  // Check if timeout is inherited
  const isTimeoutInherited = timeout === 'inherit' || timeout === undefined || timeout === null;

  const handleTimeoutDropdownSelect = useCallback((option) => {
    if (option === 'inherit') {
      updateSetting({ timeout: 'inherit' });
    } else if (option === 'custom') {
      // Switch to custom value - start with 0
      updateSetting({ timeout: 0 });
    }
  }, [updateSetting]);

  // Keyboard shortcut handlers
  const onSave = useCallback(() => {
    dispatch(saveRequest(item.uid, collection.uid));
  }, [dispatch, item.uid, collection.uid]);

  const onRun = useCallback(() => {
    dispatch(sendRequest(item, collection.uid));
  }, [dispatch, item, collection.uid]);

  // Keyboard shortcut handler for input fields
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
    }
  }, [onSave, onRun]);

  return (
    <div className="h-full w-full">
      <div className="text-xs mb-4 text-muted">{t('REQUEST_SETTINGS.DESCRIPTION')}</div>
      <div className="bruno-form">
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1 mb-4">
            <IconTag size={16} />
            {t('REQUEST_SETTINGS.TAGS')}
          </h3>
          <Tags item={item} collection={collection} />
        </div>

        <div className="flex flex-col gap-4">

          <div className="flex flex-col gap-4">
            <ToggleSelector
              checked={encodeUrl}
              onChange={onToggleUrlEncoding}
              label={t('REQUEST_SETTINGS.URL_ENCODING_LABEL')}
              description={t('REQUEST_SETTINGS.URL_ENCODING_DESC')}
              size="medium"
              data-testid="encode-url-toggle"
            />
          </div>

          <div className="flex flex-col gap-4">
            <ToggleSelector
              checked={followRedirects}
              onChange={onToggleFollowRedirects}
              label={t('REQUEST_SETTINGS.FOLLOW_REDIRECTS_LABEL')}
              description={t('REQUEST_SETTINGS.FOLLOW_REDIRECTS_DESC')}
              size="medium"
              data-testid="follow-redirects-toggle"
            />
          </div>

          <SettingsInput
            id="maxRedirects"
            label={t('REQUEST_SETTINGS.MAX_REDIRECTS_LABEL')}
            value={maxRedirects}
            onChange={onMaxRedirectsChange}
            description={t('REQUEST_SETTINGS.MAX_REDIRECTS_DESC')}
            onKeyDown={handleKeyDown}
          />

          <InheritableSettingsInput
            id="timeout"
            label={t('REQUEST_SETTINGS.TIMEOUT_LABEL')}
            value={timeout}
            description={t('REQUEST_SETTINGS.TIMEOUT_DESC')}
            onKeyDown={handleKeyDown}
            isInherited={isTimeoutInherited}
            onDropdownSelect={handleTimeoutDropdownSelect}
            onValueChange={(e) => !isTimeoutInherited && onTimeoutChange(e)}
            onCustomValueReset={() => updateSetting({ timeout: 'inherit' })}
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;
