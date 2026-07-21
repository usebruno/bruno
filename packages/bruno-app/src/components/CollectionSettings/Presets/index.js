import React from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { updateCollectionPresets } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { get } from 'lodash';
import { IconApi, IconBrandGraphql, IconPlugConnected, IconCode } from '@tabler/icons';
import Button from 'ui/Button';
import SegmentGroup, { Segment } from 'ui/SegmentGroup';
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
          <SegmentGroup
            name="requestType"
            ariaLabelledBy="presets-request-type-label"
            size="md"
            value={currentPresets.requestType || DEFAULT_PRESET_REQUEST_TYPE}
            onChange={handleRequestTypeChange}
          >
            <Segment
              value={PRESET_REQUEST_TYPES.HTTP}
              label="HTTP"
              icon={<IconApi size={15} strokeWidth={1.5} />}
              dataTestId="presets-request-type-http"
            />
            <Segment
              value={PRESET_REQUEST_TYPES.GRAPHQL}
              label="GraphQL"
              icon={<IconBrandGraphql size={15} strokeWidth={1.5} />}
              dataTestId="presets-request-type-graphql"
            />
            <Segment
              value={PRESET_REQUEST_TYPES.GRPC}
              label="gRPC"
              icon={<IconCode size={15} strokeWidth={1.5} />}
              dataTestId="presets-request-type-grpc"
            />
            <Segment
              value={PRESET_REQUEST_TYPES.WS}
              label="WebSocket"
              icon={<IconPlugConnected size={15} strokeWidth={1.5} />}
              dataTestId="presets-request-type-ws"
            />
          </SegmentGroup>
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
