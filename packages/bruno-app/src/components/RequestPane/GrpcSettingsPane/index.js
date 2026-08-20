import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import SettingsInput from 'components/SettingsInput';
import ToggleSelector from 'components/RequestPane/Settings/ToggleSelector';
import { updateItemSettings } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';

const getPropertyFromDraftOrRequest = (propertyKey, item) =>
  item.draft ? get(item, `draft.${propertyKey}`, {}) : get(item, propertyKey, {});

const GrpcSettingsPane = ({ item, collection }) => {
  const dispatch = useDispatch();

  const settings = getPropertyFromDraftOrRequest('settings', item);
  const {
    maxReceiveMessageLength = '',
    maxSendMessageLength = '',
    deadline = '',
    keepaliveTime = '',
    keepaliveTimeout = '',
    clientIdleTimeout = '',
    maxReconnectBackoff = '',
    includeDefaultValues
  } = settings;

  const updateSetting = useCallback((key, value) => {
    dispatch(updateItemSettings({
      collectionUid: collection.uid,
      itemUid: item.uid,
      settings: { [key]: value }
    }));
  }, [dispatch, collection.uid, item.uid]);

  const onNumericChange = useCallback((key) => (e) => {
    const value = e.target.value;
    if (value === '' || value === '-1' || /^-?\d+$/.test(value)) {
      updateSetting(key, value === '' ? '' : value);
    }
  }, [updateSetting]);

  const onSave = useCallback(() => {
    dispatch(saveRequest(item.uid, collection.uid));
  }, [dispatch, item.uid, collection.uid]);

  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave();
    }
  }, [onSave]);

  return (
    <div className="h-full w-full">
      <div className="text-xs mb-4 text-muted">Configure gRPC channel and request settings.</div>
      <div className="bruno-form">
        <div className="flex flex-col gap-4">
          <SettingsInput
            id="maxReceiveMessageLength"
            label="Max Receive Message Size"
            value={maxReceiveMessageLength}
            onChange={onNumericChange('maxReceiveMessageLength')}
            description="Maximum response message size in bytes (-1 for unlimited)"
            onKeyDown={handleKeyDown}
          />

          <SettingsInput
            id="maxSendMessageLength"
            label="Max Send Message Size"
            value={maxSendMessageLength}
            onChange={onNumericChange('maxSendMessageLength')}
            description="Maximum request message size in bytes (-1 for unlimited)"
            onKeyDown={handleKeyDown}
          />

          <SettingsInput
            id="deadline"
            label="Deadline (ms)"
            value={deadline}
            onChange={onNumericChange('deadline')}
            description="Per-request deadline in milliseconds, required by many gRPC servers"
            onKeyDown={handleKeyDown}
          />

          <SettingsInput
            id="keepaliveTime"
            label="Keepalive Time (ms)"
            value={keepaliveTime}
            onChange={onNumericChange('keepaliveTime')}
            description="Interval between keepalive pings to keep the connection alive"
            onKeyDown={handleKeyDown}
          />

          <SettingsInput
            id="keepaliveTimeout"
            label="Keepalive Timeout (ms)"
            value={keepaliveTimeout}
            onChange={onNumericChange('keepaliveTimeout')}
            description="Timeout waiting for a keepalive ping response"
            onKeyDown={handleKeyDown}
          />

          <SettingsInput
            id="clientIdleTimeout"
            label="Client Idle Timeout (ms)"
            value={clientIdleTimeout}
            onChange={onNumericChange('clientIdleTimeout')}
            description="Close the connection after being idle for this duration"
            onKeyDown={handleKeyDown}
          />

          <SettingsInput
            id="maxReconnectBackoff"
            label="Max Reconnect Backoff (ms)"
            value={maxReconnectBackoff}
            onChange={onNumericChange('maxReconnectBackoff')}
            description="Maximum delay between reconnection attempts after failure"
            onKeyDown={handleKeyDown}
          />

          <ToggleSelector
            checked={includeDefaultValues !== false}
            onChange={() => updateSetting('includeDefaultValues', includeDefaultValues === false)}
            label="Include Default Values"
            description="Include fields with protobuf default values (0, empty string, false) in responses"
            size="medium"
          />
        </div>
      </div>
    </div>
  );
};

export default GrpcSettingsPane;
