import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import get from 'lodash/get';
import { utils } from '@usebruno/common';
import Toggle from 'ui/Toggle';
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
