import React from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { updateCollectionPresets } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { get } from 'lodash';
import Button from 'ui/Button';
import RadioGroup, { Radio } from 'ui/RadioGroup';
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

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  const handleRequestTypeChange = (value) => {
    updatePresets({ requestType: value });
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
          <label className="settings-label flex items-center" id="presets-request-type-label">
            Request Type
          </label>
          <RadioGroup
            name="requestType"
            ariaLabelledBy="presets-request-type-label"
            orientation="horizontal"
            size="sm"
            value={currentPresets.requestType || DEFAULT_PRESET_REQUEST_TYPE}
            onChange={handleRequestTypeChange}
          >
            <Radio value={PRESET_REQUEST_TYPES.HTTP} label="HTTP" dataTestId="presets-request-type-http" />
            <Radio value={PRESET_REQUEST_TYPES.GRAPHQL} label="GraphQL" dataTestId="presets-request-type-graphql" />
            <Radio value={PRESET_REQUEST_TYPES.GRPC} label="gRPC" dataTestId="presets-request-type-grpc" />
            <Radio value={PRESET_REQUEST_TYPES.WS} label="WebSocket" dataTestId="presets-request-type-ws" />
          </RadioGroup>
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
