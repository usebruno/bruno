import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import get from 'lodash/get';
import { IconTag, IconChevronDown } from '@tabler/icons';
import { utils } from '@usebruno/common';
import ToggleSelector from 'components/RequestPane/Settings/ToggleSelector';
import MenuDropdown from 'ui/MenuDropdown';
import StatusBadge from 'ui/StatusBadge';
import { useTheme } from 'providers/Theme';
import SettingsInput from 'components/SettingsInput';
import InheritableSettingsInput from 'components/InheritableSettingsInput';
import { updateItemSettings, toggleAppMode } from 'providers/ReduxStore/slices/collections';
import { setTabAppPreview } from 'providers/ReduxStore/slices/tabs';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import Tags from './Tags/index';

const HTTP_VERSION_LABELS = {
  inherit: 'Inherit',
  auto: 'Auto',
  http1: 'HTTP/1.1',
  http2: 'HTTP/2'
};

// Default settings configuration
const DEFAULT_SETTINGS = {
  encodeUrl: false,
  followRedirects: true,
  maxRedirects: utils.DEFAULT_MAX_REDIRECTS,
  timeout: 'inherit',
  forwardAuthorizationHeader: true
};

const Settings = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();

  // Get current settings with defaults applied
  const getPropertyFromDraftOrRequest = (propertyKey) =>
    item.draft ? get(item, `draft.${propertyKey}`, {}) : get(item, propertyKey, {});

  const rawSettings = getPropertyFromDraftOrRequest('settings');
  const settings = { ...DEFAULT_SETTINGS, ...rawSettings };
  const { encodeUrl, followRedirects, maxRedirects, timeout, forwardAuthorizationHeader } = settings;
  const enableApp = getPropertyFromDraftOrRequest('app.enabled') === true;

  // Reusable function to update settings
  const updateSetting = useCallback((settingUpdate) => {
    const updatedSettings = { ...settings, ...settingUpdate };
    dispatch(updateItemSettings({
      collectionUid: collection.uid,
      itemUid: item.uid,
      settings: updatedSettings
    }));
  }, [dispatch, collection.uid, item.uid, settings]);

  // HTTP version (request > collection > app).
  const appHttpVersion = useSelector((state) => get(state.app.preferences, 'request.httpVersion', 'http1'));
  const collectionHttpVersion = collection?.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.http.version', 'inherit')
    : get(collection, 'brunoConfig.http.version', 'inherit');
  const effectiveInheritedHttpVersion
    = collectionHttpVersion && collectionHttpVersion !== 'inherit' ? collectionHttpVersion : appHttpVersion;
  const currentHttpVersion = rawSettings.httpVersion || 'inherit';

  const onHttpVersionChange = useCallback((value) => {
    updateSetting({ httpVersion: value });
  }, [updateSetting]);

  const httpVersionItems = [
    {
      id: 'inherit',
      label: `Inherit (${HTTP_VERSION_LABELS[effectiveInheritedHttpVersion] || effectiveInheritedHttpVersion})`,
      onClick: () => onHttpVersionChange('inherit')
    },
    { id: 'auto', label: HTTP_VERSION_LABELS.auto, onClick: () => onHttpVersionChange('auto') },
    { id: 'http1', label: HTTP_VERSION_LABELS.http1, onClick: () => onHttpVersionChange('http1') },
    { id: 'http2', label: HTTP_VERSION_LABELS.http2, onClick: () => onHttpVersionChange('http2') }
  ];
  const currentHttpVersionLabel = HTTP_VERSION_LABELS[currentHttpVersion] || HTTP_VERSION_LABELS.inherit;

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

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                HTTP Version
                <StatusBadge status="info" size="xs">Beta</StatusBadge>
              </label>
              <p className="text-xs text-gray-700 dark:text-gray-400">
                Choose the HTTP version for this request. Inherit uses the collection default.
              </p>
            </div>
            <MenuDropdown
              items={httpVersionItems}
              selectedItemId={currentHttpVersion}
              placement="bottom-end"
              appendTo={() => document.body}
              popperOptions={{ strategy: 'fixed' }}
            >
              <button
                type="button"
                className="flex items-center justify-between rounded-sm px-2 py-1 h-8 w-24 outline-none cursor-pointer text-xs"
                style={{ backgroundColor: theme.input.bg, border: `1px solid ${theme.input.border}`, color: theme.text }}
                data-testid="request-http-version"
              >
                <span>{currentHttpVersionLabel}</span>
                <IconChevronDown size={12} />
              </button>
            </MenuDropdown>
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default Settings;
