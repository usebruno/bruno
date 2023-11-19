import React, { useEffect } from 'react';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import cloneDeep from 'lodash/cloneDeep';

const PresetsSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const {
    brunoConfig: { presets: defaultPresets = {} }
  } = collection;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      defaultType: defaultPresets.defaultType || 'http-request',
      defaultRequestUrl: defaultPresets.defaultRequestUrl || ''
    },
    onSubmit: (newPresets) => {
      const brunoConfig = cloneDeep(collection.brunoConfig);
      brunoConfig.presets = newPresets;
      dispatch(updateBrunoConfig(brunoConfig, collection.uid));
      toast.success('Collection presets updated');
    }
  });

  return (
    <StyledWrapper>
      <h1 className="font-medium mb-3">Collection Presets</h1>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="mb-3 flex items-center">
          <label className="settings-label flex  items-center" htmlFor="enabled">
            Default Request Type
          </label>
          <div className="flex items-center mt-2">
            <input
              id="http-request"
              className="cursor-pointer"
              type="radio"
              name="defaultType"
              onChange={formik.handleChange}
              value="http-request"
              checked={formik.values.defaultType === 'http-request'}
            />
            <label htmlFor="http-request" className="ml-1 cursor-pointer select-none">
              HTTP
            </label>

            <input
              id="graphql-request"
              className="ml-4 cursor-pointer"
              type="radio"
              name="defaultType"
              onChange={formik.handleChange}
              value="graphql-request"
              checked={formik.values.defaultType === 'graphql-request'}
            />
            <label htmlFor="graphql-request" className="ml-1 cursor-pointer select-none">
              GraphQL
            </label>
          </div>
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="defaultRequestUrl">
            Default Base URL
          </label>
          <div className="flex items-center mt-2 ">
            <div className="flex items-center flex-grow input-container h-full">
              <input
                id="request-url"
                type="text"
                name="defaultRequestUrl"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.defaultRequestUrl || ''}
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
