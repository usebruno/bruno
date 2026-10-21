import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import get from 'lodash/get';
import { IconTag, IconChevronDown } from '@tabler/icons';
import { utils } from '@usebruno/common';
import ToggleSelector from 'components/RequestPane/Settings/ToggleSelector';
import SettingsInput from 'components/SettingsInput';
import InheritableSettingsInput from 'components/InheritableSettingsInput';
import MenuDropdown from 'ui/MenuDropdown';
import { useTheme } from 'providers/Theme';
import { updateItemSettings, toggleAppMode } from 'providers/ReduxStore/slices/collections';
import { setTabAppPreview } from 'providers/ReduxStore/slices/tabs';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import Tags from './Tags/index';

const HTTP_VERSION_LABELS = {
  'auto': 'Auto',
  'http1.1': 'HTTP/1.1',
  'http2': 'HTTP/2'
};

// Default settings configuration
const DEFAULT_SETTINGS = {
  encodeUrl: false,
  followRedirects: true,
  maxRedirects: utils.DEFAULT_MAX_REDIRECTS,
  timeout: 'inherit',
  forwardAuthorizationHeader: true,
  httpVersion: 'inherit'
};

const Settings = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();

  // Get current settings with defaults applied
  const getPropertyFromDraftOrRequest = (propertyKey) =>
    item.draft ? get(item, `draft.${propertyKey}`, {}) : get(item, propertyKey, {});

  const rawSettings = getPropertyFromDraftOrRequest('settings');
  const settings = { ...DEFAULT_SETTINGS, ...rawSettings };
  const { encodeUrl, followRedirects, maxRedirects, timeout, forwardAuthorizationHeader, httpVersion } = settings;
  const enableApp = getPropertyFromDraftOrRequest('app.enabled') === true;

  // Resolve what `inherit` actually uses: collection httpVersion, else the app preference.
  const appHttpVersion = useSelector((state) => get(state.app.preferences, 'request.httpVersion', 'http1.1'));
  const collectionHttpVersion = collection?.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.http.version')
    : get(collection, 'brunoConfig.http.version');
  const resolvedInheritedVersion = collectionHttpVersion && collectionHttpVersion !== 'inherit' ? collectionHttpVersion : appHttpVersion;
  const httpVersionItems = [
    {
      id: 'inherit',
      // Strip the inner parens of 'HTTP/2 (Prior Knowledge)' so Inherit doesn't nest parens.
      label: `Inherit (${(HTTP_VERSION_LABELS[resolvedInheritedVersion] || resolvedInheritedVersion).replace(/[()]/g, '').trim()})`
    },
    { id: 'auto', label: HTTP_VERSION_LABELS['auto'] },
    { id: 'http1.1', label: HTTP_VERSION_LABELS['http1.1'] },
    { id: 'http2', label: HTTP_VERSION_LABELS['http2'] }
  ];
  const currentHttpVersionLabel = httpVersionItems.find((option) => option.id === httpVersion)?.label || httpVersionItems[0].label;

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

  const onToggleForwardAuthorizationOnRedirect = useCallback(() =>
    updateSetting({ forwardAuthorizationHeader: !forwardAuthorizationHeader }), [forwardAuthorizationHeader, updateSetting]);

  const onToggleEnableApp = useCallback(() => {
    const next = !enableApp;
    dispatch(toggleAppMode({ enabled: next, itemUid: item.uid, collectionUid: collection.uid }));
    if (next) {
      dispatch(setTabAppPreview({ uid: item.uid, appPreview: false }));
    }
  }, [enableApp, dispatch, item.uid, collection.uid]);

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
      <div className="text-xs mb-4 text-muted">Configure request settings for this item.</div>
      <div className="bruno-form">
        <div className="mb-6">
          <h3 className="text-xs font-medium flex items-center gap-1 mb-4">
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
              data-testid="encode-url-toggle"
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

          <div className="flex flex-col gap-4">
            <ToggleSelector
              checked={forwardAuthorizationHeader}
              onChange={onToggleForwardAuthorizationOnRedirect}
              label="Forward Authorization on Redirect"
              description="Send Authorization and Proxy-Authorization headers when a redirect points to a different origin"
              size="medium"
              data-testid="forward-auth-header-toggle"
            />
          </div>

          {item.type === 'http-request' && (
            <div className="flex flex-col gap-4">
              <ToggleSelector
                checked={enableApp}
                onChange={onToggleEnableApp}
                label="Enable App"
                description="Show the App tab and app view mode for this request"
                size="medium"
                data-testid="enable-app-toggle"
              />
            </div>
          )}

          <SettingsInput
            id="maxRedirects"
            label="Max Redirects"
            value={maxRedirects}
            onChange={onMaxRedirectsChange}
            description="Set a limit for the number of redirects to follow"
            onKeyDown={handleKeyDown}
          />

          <InheritableSettingsInput
            id="timeout"
            label="Timeout (ms)"
            value={timeout}
            description="Set maximum time to wait before aborting the request"
            onKeyDown={handleKeyDown}
            isInherited={isTimeoutInherited}
            onDropdownSelect={handleTimeoutDropdownSelect}
            onValueChange={(e) => !isTimeoutInherited && onTimeoutChange(e)}
            onCustomValueReset={() => updateSetting({ timeout: 'inherit' })}
          />

          {item.type === 'http-request' && (
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-900 dark:text-gray-100">HTTP Version</label>
                <p className="text-xs text-gray-700 dark:text-gray-400">
                  Select the HTTP version to use for sending the request
                </p>
              </div>
              <MenuDropdown
                items={httpVersionItems.map((option) => ({
                  id: option.id,
                  label: option.label,
                  onClick: () => updateSetting({ httpVersion: option.id })
                }))}
                selectedItemId={httpVersion}
                placement="bottom-end"
                appendTo={() => document.body}
                popperOptions={{ strategy: 'fixed' }}
                sameWidth
              >
                <button
                  type="button"
                  className="flex items-center justify-between rounded-sm px-2 py-1 h-8 w-64 outline-none cursor-pointer"
                  style={{ backgroundColor: theme.input.bg, border: `1px solid ${theme.input.border}` }}
                  data-testid="request-http-version"
                >
                  <span>{currentHttpVersionLabel}</span>
                  <IconChevronDown size={14} strokeWidth={1.5} />
                </button>
              </MenuDropdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
