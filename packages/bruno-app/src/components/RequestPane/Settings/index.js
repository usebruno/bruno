import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import get from 'lodash/get';
import { IconChevronDown } from '@tabler/icons';
import { utils } from '@usebruno/common';
import Toggle from 'ui/Toggle';
import MenuDropdown from 'ui/MenuDropdown';
import StatusBadge from 'ui/StatusBadge';
import SettingsInput from 'components/SettingsInput';
import InheritableSettingsInput from 'components/InheritableSettingsInput';
import { updateItemSettings, toggleAppMode } from 'providers/ReduxStore/slices/collections';
import { setTabAppPreview, addTab } from 'providers/ReduxStore/slices/tabs';
import { updateActivePreferencesTab } from 'providers/ReduxStore/slices/app';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import Tags from './Tags/index';
import FormField from 'ui/patterns/FormField';
import FieldList from 'ui/patterns/FieldList';
import StyledWrapper from './StyledWrapper';

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
  const inheritedTimeout = Number(useSelector((state) => state.app.preferences?.request?.timeout)) || 0;

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

  // Check if timeout is inherited
  const isTimeoutInherited = timeout === 'inherit' || timeout === undefined || timeout === null;

  const onTimeoutChange = useCallback((value) => updateSetting({ timeout: value }), [updateSetting]);
  const onTimeoutOverride = useCallback(() => updateSetting({ timeout: inheritedTimeout }), [updateSetting, inheritedTimeout]);
  const onTimeoutInherit = useCallback(() => updateSetting({ timeout: 'inherit' }), [updateSetting]);

  // The request timeout lives in Preferences > General
  const openTimeoutSource = useCallback(() => {
    dispatch(updateActivePreferencesTab({ tab: 'general' }));
    dispatch(addTab({
      type: 'preferences',
      uid: `${collection.uid}-preferences`,
      collectionUid: collection.uid
    }));
  }, [dispatch, collection.uid]);

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
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">Configure request settings for this item.</div>
      <div className="bruno-form">
        <FieldList dividers className="request-settings-list">
          <FormField
            label="Tags"
            labelId="request-settings-tags-label"
            className="tags-field"
          >
            <div className="w-full" role="group" aria-labelledby="request-settings-tags-label">
              <Tags item={item} collection={collection} />
            </div>
          </FormField>
          <FormField
            layout="inline"
            label={(
              <span className="inline-flex items-center gap-2">
                HTTP Version
                <StatusBadge status="info" size="xs">Beta</StatusBadge>
              </span>
            )}
            labelId="request-http-version-label"
            description="Choose the HTTP version for this request. Inherit uses the collection default."
            descriptionId="request-http-version-description"
          >
            <MenuDropdown
              items={httpVersionItems}
              selectedItemId={currentHttpVersion}
              placement="bottom-end"
              appendTo={() => document.body}
              popperOptions={{ strategy: 'fixed' }}
            >
              <button
                type="button"
                id="request-http-version-trigger"
                className="settings-dropdown-trigger w-24"
                aria-labelledby="request-http-version-label request-http-version-trigger"
                aria-describedby="request-http-version-description"
                data-testid="request-http-version"
              >
                <span>{currentHttpVersionLabel}</span>
                <IconChevronDown size={12} />
              </button>
            </MenuDropdown>
          </FormField>
          <Toggle
            checked={encodeUrl}
            onChange={onToggleUrlEncoding}
            label="URL Encoding"
            description="Automatically encode query parameters in the URL"
            size="medium"
            data-testid="encode-url-toggle"
          />
          <InheritableSettingsInput
            id="timeout"
            label="Timeout (ms)"
            description="Set maximum time to wait before aborting the request"
            value={timeout}
            inheritedValue={inheritedTimeout}
            inheritedPlaceholder={inheritedTimeout === 0 ? '0 (no timeout)' : String(inheritedTimeout)}
            sourceName="Preferences"
            onSourceClick={openTimeoutSource}
            sourceLinkLabel="Open Preferences, where the default request timeout is set"
            isInherited={isTimeoutInherited}
            onValueChange={onTimeoutChange}
            onOverride={onTimeoutOverride}
            onInherit={onTimeoutInherit}
            onKeyDown={handleKeyDown}
            overrideLabel={`Override the Preferences timeout (${inheritedTimeout} ms) for this request`}
            inheritLabel={`Inherit the Preferences timeout (${inheritedTimeout} ms)`}
            inheritTooltip={`Inherit from Preferences (${inheritedTimeout === 0 ? 'no timeout' : `${inheritedTimeout} ms`})`}
          />
          <Toggle
            checked={followRedirects}
            onChange={onToggleFollowRedirects}
            label="Automatically Follow Redirects"
            description="Follow HTTP redirects automatically"
            size="medium"
            data-testid="follow-redirects-toggle"
          />
          <SettingsInput
            id="maxRedirects"
            label="Max Redirects"
            value={maxRedirects}
            onChange={onMaxRedirectsChange}
            description="Set a limit for the number of redirects to follow"
            onKeyDown={handleKeyDown}
          />
          <Toggle
            checked={forwardAuthorizationHeader}
            onChange={onToggleForwardAuthorizationOnRedirect}
            label="Forward Authorization on Redirect"
            description="Send Authorization and Proxy-Authorization headers when a redirect points to a different origin."
            size="medium"
            data-testid="forward-auth-header-toggle"
          />

          {item.type === 'http-request' && (
            <Toggle
              checked={enableApp}
              onChange={onToggleEnableApp}
              label="Enable App"
              description="Show the App tab and app view mode for this request"
              size="medium"
              data-testid="enable-app-toggle"
            />
          )}
        </FieldList>
      </div>
    </StyledWrapper>
  );
};

export default Settings;
