import React from 'react';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import cloneDeep from 'lodash/cloneDeep';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';

const PresetsSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const isGrpcEnabled = useBetaFeature(BETA_FEATURES.GRPC);
  const {
    brunoConfig: { presets: presets = {} }
  } = collection;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      requestType: presets.requestType === 'grpc' && !isGrpcEnabled ? 'http' : presets.requestType || 'http',
      requestUrl: presets.requestUrl || ''
    },
    onSubmit: (newPresets) => {
      // If gRPC is disabled but the preset is set to grpc, change it to http
      if (!isGrpcEnabled && newPresets.requestType === 'grpc') {
        newPresets.requestType = 'http';
      }

      const brunoConfig = cloneDeep(collection.brunoConfig);
      brunoConfig.presets = newPresets;
      dispatch(updateBrunoConfig(brunoConfig, collection.uid));
      toast.success('Collection presets updated');
    }
  });

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">
        These presets will be used as the default values for new requests in this collection.
      </div>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
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
              onChange={formik.handleChange}
              value="http"
              checked={formik.values.requestType === 'http'}
            />
            <label htmlFor="http" className="ml-1 cursor-pointer select-none">
              HTTP
            </label>

            <input
              id="graphql"
              className="ml-4 cursor-pointer"
              type="radio"
              name="requestType"
              onChange={formik.handleChange}
              value="graphql"
              checked={formik.values.requestType === 'graphql'}
            />
            <label htmlFor="graphql" className="ml-1 cursor-pointer select-none">
              GraphQL
            </label>

            {isGrpcEnabled && (
              <>
                <input
                  id="grpc"
                  className="ml-4 cursor-pointer"
                  type="radio"
                  name="requestType"
                  onChange={formik.handleChange}
                  value="grpc"
                  checked={formik.values.requestType === 'grpc'}
                />
                <label htmlFor="grpc" className="ml-1 cursor-pointer select-none">
                  gRPC
                </label>
              </>
            )}
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
                onChange={formik.handleChange}
                value={formik.values.requestUrl || ''}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button type="submit" className="submit btn btn-sm btn-secondary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default PresetsSettings;
