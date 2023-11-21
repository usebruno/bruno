import React, { useRef, forwardRef } from 'react';
import find from 'lodash/find';
import Dropdown from 'components/Dropdown';
import { IconCaretDown, IconDatabase, IconDatabaseOff } from '@tabler/icons';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import cloneDeep from 'lodash/cloneDeep';

const PresetsSettings = ({ collection }) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();
  const { environments } = collection;
  const {
    brunoConfig: { presets: presets = {} }
  } = collection;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      requestType: presets.requestType || 'http',
      requestUrl: presets.requestUrl || '',
      environment: find(environments, (e) => e.name === presets.environment) ? presets.environment : null
    },
    onSubmit: (newPresets) => {
      const brunoConfig = cloneDeep(collection.brunoConfig);
      brunoConfig.presets = newPresets;
      dispatch(updateBrunoConfig(brunoConfig, collection.uid));
      toast.success('Collection presets updated');
    }
  });

  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="default-environment flex items-center justify-center pl-3 pr-2 py-1 select-none">
        {formik.values.environment || 'No Environment'}
        <IconCaretDown className="caret" size={14} strokeWidth={2} />
      </div>
    );
  });
  return (
    <StyledWrapper>
      <h1 className="font-medium mb-3">Collection Presets</h1>
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
          </div>
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="requestUrl">
            Base URL
          </label>
          <div className="flex items-center">
            <div className="flex items-center flex-grow input-container h-full">
              <input
                id="request-url"
                type="text"
                name="requestUrl"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.requestUrl || ''}
              />
            </div>
          </div>
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="defaultEnv">
            Environment
          </label>
          <div className="flex items-center cursor-pointer default-environment">
            <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
              {environments && environments.length
                ? environments.map((e) => (
                    <div
                      className="dropdown-item"
                      name="environment"
                      key={e.uid}
                      value={formik.values.environment || 'No Environment'}
                      onChange={formik.handleChange}
                      onClick={() => {
                        formik.setFieldValue('environment', e.name);
                        dropdownTippyRef.current.hide();
                      }}
                    >
                      <IconDatabase size={18} strokeWidth={1.5} /> <span className="ml-2">{e.name}</span>
                    </div>
                  ))
                : null}
              <div
                className="dropdown-item"
                name="environment"
                onChange={formik.handleChange}
                onClick={() => {
                  dropdownTippyRef.current.hide();
                  formik.setFieldValue('environment', null);
                }}
              >
                <IconDatabaseOff size={18} strokeWidth={1.5} />
                <span className="ml-2">No Environment</span>
              </div>
            </Dropdown>
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
