import React, { useRef } from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { updateCollectionPresets } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { get } from 'lodash';
import Button from 'ui/Button';
import Dropdown from 'components/Dropdown';
import { IconCaretDown, IconFilePlus, IconWorld } from '@tabler/icons';
import { DEFAULT_PRESET_REQUEST_TYPE, PRESET_REQUEST_TYPES } from 'utils/common/constants';

const PresetsSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const initialPresets = { requestType: DEFAULT_PRESET_REQUEST_TYPE, requestUrl: '' };

  // Get presets from draft.brunoConfig if it exists, otherwise from brunoConfig
  const currentPresets = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.presets', initialPresets)
    : get(collection, 'brunoConfig.presets', initialPresets);

  // Helper to update presets config
  const updatePresets = (updates) => {
    const updatedPresets = { ...currentPresets, ...updates };
    dispatch(updateCollectionPresets({
      collectionUid: collection.uid,
      presets: updatedPresets
    }));
  };

  // Default environment is part of the collection presets; like Request Type and Base URL
  // it is written to the draft and persisted via the Save button (or autosave).
  const environments = collection?.environments || [];
  const defaultEnvironmentName = currentPresets.defaultEnvironment || '';
  const defaultEnvDropdownRef = useRef(null);
  const closeDefaultEnvDropdown = () => defaultEnvDropdownRef.current?.hide();

  const handleDefaultEnvironmentChange = (name) => {
    closeDefaultEnvDropdown();
    if (name) {
      updatePresets({ defaultEnvironment: name });
    } else {
      // "None" — remove the default from the draft presets.
      const { defaultEnvironment, ...rest } = currentPresets;
      dispatch(updateCollectionPresets({ collectionUid: collection.uid, presets: rest }));
    }
  };

  const defaultEnvTrigger = (
    <div className="default-env-trigger flex items-center justify-between cursor-pointer" data-testid="presets-default-environment">
      <span className="truncate">{defaultEnvironmentName || 'None'}</span>
      <IconCaretDown className="caret" size={14} strokeWidth={2} />
    </div>
  );

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  const handleRequestTypeChange = (e) => {
    updatePresets({ requestType: e.target.value });
  };

  const handleRequestUrlChange = (e) => {
    updatePresets({ requestUrl: e.target.value });
  };

  const requestType = currentPresets.requestType || DEFAULT_PRESET_REQUEST_TYPE;

  return (
    <StyledWrapper className="h-full w-full">
      <div className="bruno-form">
        {/* New Request Defaults */}
        <div className="preset-section">
          <div className="preset-section-icon requests">
            <IconFilePlus size={20} strokeWidth={1.5} />
          </div>
          <div className="preset-section-body">
            <h2 className="preset-section-title">New Request Defaults</h2>
            <p className="preset-section-subtitle">Applied when a new request is created in this collection.</p>

            <div className="preset-field">
              <label className="preset-field-label">Request Type</label>
              <div className="flex items-center">
                <input
                  id="http"
                  data-testid="presets-request-type-http"
                  className="cursor-pointer"
                  type="radio"
                  name="requestType"
                  onChange={handleRequestTypeChange}
                  value={PRESET_REQUEST_TYPES.HTTP}
                  checked={requestType === PRESET_REQUEST_TYPES.HTTP}
                />
                <label htmlFor="http" className="ml-1 cursor-pointer select-none">HTTP</label>

                <input
                  id="graphql"
                  data-testid="presets-request-type-graphql"
                  className="ml-4 cursor-pointer"
                  type="radio"
                  name="requestType"
                  onChange={handleRequestTypeChange}
                  value={PRESET_REQUEST_TYPES.GRAPHQL}
                  checked={requestType === PRESET_REQUEST_TYPES.GRAPHQL}
                />
                <label htmlFor="graphql" className="ml-1 cursor-pointer select-none">GraphQL</label>

                <input
                  id="grpc"
                  data-testid="presets-request-type-grpc"
                  className="ml-4 cursor-pointer"
                  type="radio"
                  name="requestType"
                  onChange={handleRequestTypeChange}
                  value={PRESET_REQUEST_TYPES.GRPC}
                  checked={requestType === PRESET_REQUEST_TYPES.GRPC}
                />
                <label htmlFor="grpc" className="ml-1 cursor-pointer select-none">gRPC</label>

                <input
                  id="ws"
                  data-testid="presets-request-type-ws"
                  className="ml-4 cursor-pointer"
                  type="radio"
                  name="requestType"
                  onChange={handleRequestTypeChange}
                  value={PRESET_REQUEST_TYPES.WS}
                  checked={requestType === PRESET_REQUEST_TYPES.WS}
                />
                <label htmlFor="ws" className="ml-1 cursor-pointer select-none">WebSocket</label>
              </div>
              <p className="preset-field-hint">New requests start with this type selected.</p>
            </div>

            <div className="preset-field">
              <label className="preset-field-label" htmlFor="request-url">Base URL</label>
              <input
                id="request-url"
                data-testid="presets-request-url"
                type="text"
                name="requestUrl"
                placeholder="http://localhost:6000"
                className="block textbox preset-input"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={handleRequestUrlChange}
                value={currentPresets.requestUrl || ''}
              />
              <p className="preset-field-hint">Pre-fills the URL field of new requests. It is not prepended to request URLs when sending.</p>
            </div>
          </div>
        </div>

        {/* Default Environment */}
        <div className="preset-section">
          <div className="preset-section-icon environment">
            <IconWorld size={20} strokeWidth={1.5} />
          </div>
          <div className="preset-section-body">
            <h2 className="preset-section-title">Default Environment</h2>
            <p className="preset-section-subtitle">Applied when this collection is opened.</p>

            <div className="preset-field">
              <label className="preset-field-label" htmlFor="default-environment">Environment</label>
              <div className="default-env-dropdown">
                <Dropdown onCreate={(ref) => (defaultEnvDropdownRef.current = ref)} icon={defaultEnvTrigger} placement="bottom-start" sameWidth>
                  <div
                    className={`dropdown-item ${!defaultEnvironmentName ? 'active' : ''}`}
                    onClick={() => handleDefaultEnvironmentChange('')}
                  >
                    None
                  </div>
                  {environments.map((env) => (
                    <div
                      key={env.uid}
                      className={`dropdown-item ${env.name === defaultEnvironmentName ? 'active' : ''}`}
                      onClick={() => handleDefaultEnvironmentChange(env.name)}
                    >
                      {env.name}
                    </div>
                  ))}
                </Dropdown>
              </div>
              <p className="preset-field-hint">
                Auto-selected the first time this collection is opened, when no environment has been chosen yet.
                It is not a fallback for requests sent without an environment.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button type="button" size="sm" data-testid="presets-save-btn" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default PresetsSettings;
