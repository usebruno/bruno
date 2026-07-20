import React, { useRef } from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { updateCollectionPresets } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { get } from 'lodash';
import Button from 'ui/Button';
import Dropdown from 'components/Dropdown';
import { IconCaretDown } from '@tabler/icons';
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

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">
        These presets will be used as the default values for new requests in this collection.
      </div>
      <div className="bruno-form">
        <div className="mb-3 flex items-center">
          <label className="settings-label flex items-center" htmlFor="http">
            Request Type
          </label>
          <div className="flex items-center">
            <input
              id="http"
              data-testid="presets-request-type-http"
              className="cursor-pointer"
              type="radio"
              name="requestType"
              onChange={handleRequestTypeChange}
              value={PRESET_REQUEST_TYPES.HTTP}
              checked={(currentPresets.requestType || DEFAULT_PRESET_REQUEST_TYPE) === PRESET_REQUEST_TYPES.HTTP}
            />
            <label htmlFor="http" className="ml-1 cursor-pointer select-none">
              HTTP
            </label>

            <input
              id="graphql"
              data-testid="presets-request-type-graphql"
              className="ml-4 cursor-pointer"
              type="radio"
              name="requestType"
              onChange={handleRequestTypeChange}
              value={PRESET_REQUEST_TYPES.GRAPHQL}
              checked={(currentPresets.requestType || DEFAULT_PRESET_REQUEST_TYPE) === PRESET_REQUEST_TYPES.GRAPHQL}
            />
            <label htmlFor="graphql" className="ml-1 cursor-pointer select-none">
              GraphQL
            </label>

            <input
              id="grpc"
              data-testid="presets-request-type-grpc"
              className="ml-4 cursor-pointer"
              type="radio"
              name="requestType"
              onChange={handleRequestTypeChange}
              value={PRESET_REQUEST_TYPES.GRPC}
              checked={(currentPresets.requestType || DEFAULT_PRESET_REQUEST_TYPE) === PRESET_REQUEST_TYPES.GRPC}
            />
            <label htmlFor="grpc" className="ml-1 cursor-pointer select-none">
              gRPC
            </label>

            <input
              id="ws"
              data-testid="presets-request-type-ws"
              className="ml-4 cursor-pointer"
              type="radio"
              name="requestType"
              onChange={handleRequestTypeChange}
              value={PRESET_REQUEST_TYPES.WS}
              checked={(currentPresets.requestType || DEFAULT_PRESET_REQUEST_TYPE) === PRESET_REQUEST_TYPES.WS}
            />
            <label htmlFor="ws" className="ml-1 cursor-pointer select-none">
              WebSocket
            </label>
          </div>
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="request-url">
            Base URL
          </label>
          <div className="flex items-center w-full">
            <div className="flex items-center flex-grow input-container h-full">
              <input
                id="request-url"
                data-testid="presets-request-url"
                type="text"
                name="requestUrl"
                placeholder="Request URL"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={handleRequestUrlChange}
                value={currentPresets.requestUrl || ''}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="default-environment">
            Default Environment
          </label>
          <div className="flex items-center default-env-dropdown">
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
        </div>
        <div className="text-xs mb-4 text-muted">
          Automatically selected the first time this collection is opened, when no environment has been chosen.
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
