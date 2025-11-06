import React from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { updateCollectionPresets } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';

const PresetsSettings = ({ collection }) => {
  const dispatch = useDispatch();

  // Get presets from draft.brunoConfig if it exists, otherwise from brunoConfig
  const currentPresets = collection.draft?.brunoConfig?.presets
    ? collection.draft.brunoConfig.presets
    : (collection.brunoConfig?.presets || {});

  // Helper to update presets config
  const updatePresets = (updates) => {
    const updatedPresets = { ...currentPresets, ...updates };
    dispatch(updateCollectionPresets({
      collectionUid: collection.uid,
      presets: updatedPresets
    }));
  };

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
          <label className="settings-label flex  items-center" htmlFor="enabled">
            Request Type
          </label>
          <div className="flex items-center">
            <input
              id="http"
              className="cursor-pointer"
              type="radio"
              name="requestType"
              onChange={handleRequestTypeChange}
              value="http"
              checked={(currentPresets.requestType || 'http') === 'http'}
            />
            <label htmlFor="http" className="ml-1 cursor-pointer select-none">
              HTTP
            </label>

            <input
              id="graphql"
              className="ml-4 cursor-pointer"
              type="radio"
              name="requestType"
              onChange={handleRequestTypeChange}
              value="graphql"
              checked={(currentPresets.requestType || 'http') === 'graphql'}
            />
            <label htmlFor="graphql" className="ml-1 cursor-pointer select-none">
              GraphQL
            </label>

            <input
              id="grpc"
              className="ml-4 cursor-pointer"
              type="radio"
              name="requestType"
              onChange={handleRequestTypeChange}
              value="grpc"
              checked={(currentPresets.requestType || 'http') === 'grpc'}
            />
            <label htmlFor="grpc" className="ml-1 cursor-pointer select-none">
              gRPC
            </label>
          </div>
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="requestUrl">
            Base URL
          </label>
          <div className="flex items-center w-full">
            <div className="flex items-center flex-grow input-container h-full">
              <input
                id="request-url"
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
          <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default PresetsSettings;
