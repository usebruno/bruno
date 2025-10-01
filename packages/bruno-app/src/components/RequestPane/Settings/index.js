import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { IconTag } from '@tabler/icons';
import ToggleSelector from 'components/RequestPane/Settings/ToggleSelector';
import NumberInput from 'components/RequestPane/Settings/NumberInput';
import { updateItemSettings } from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import Tags from './Tags/index';

// Default settings configuration
const DEFAULT_SETTINGS = {
  encodeUrl: false,
  followRedirects: true,
  maxRedirects: 5,
  timeout: 0
};

const Settings = ({ item, collection }) => {
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

  const onMaxRedirectsChange = useCallback((value) =>
    updateSetting({ maxRedirects: value }), [updateSetting]);

  const onTimeoutChange = useCallback((value) =>
    updateSetting({ timeout: value }), [updateSetting]);

  // Keyboard shortcut handlers
  const onSave = useCallback(() => {
    dispatch(saveRequest(item.uid, collection.uid));
  }, [dispatch, item.uid, collection.uid]);

  const onRun = useCallback(() => {
    dispatch(sendRequest(item, collection.uid));
  }, [dispatch, item, collection.uid]);

  return (
    <div className="h-full w-full">
      <div className="text-xs mb-4 text-muted">Configure request settings for this item.</div>
      <div className="bruno-form">
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1 mb-4">
            <IconTag size={16} />
            Tags
          </h3>
          <Tags item={item} collection={collection} />
        </div>

        <div className="flex flex-col gap-4">

          <div className="flex flex-col gap-4">
            <ToggleSelector
              checked={encodeUrl}
              onChange={onToggleUrlEncoding}
              label="URL Encoding"
              description="Automatically encode query parameters in the URL"
              size="medium"
            />
          </div>

          <div className="flex flex-col gap-4">
            <ToggleSelector
              checked={followRedirects}
              onChange={onToggleFollowRedirects}
              label="Automatically Follow Redirects"
              description="Follow HTTP redirects automatically"
              size="medium"
              data-testid="follow-redirects-toggle"
            />
          </div>

          <NumberInput
            id="maxRedirects"
            label="Max Redirects"
            value={maxRedirects}
            onChange={onMaxRedirectsChange}
            min={0}
            max={50}
            description="Set a limit for the number of redirects to follow"
            onSave={onSave}
            onRun={onRun}
          />

          <NumberInput
            id="timeout"
            label="Timeout (ms)"
            value={timeout}
            onChange={onTimeoutChange}
            min={0}
            max={300000}
            description="Set maximum time to wait before aborting the request"
            onSave={onSave}
            onRun={onRun}
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;