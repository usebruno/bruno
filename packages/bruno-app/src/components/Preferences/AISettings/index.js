import React, { useState, useCallback, useEffect } from 'react';
import get from 'lodash/get';
import debounce from 'lodash/debounce';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { IconEye, IconEyeOff } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';

const AISettings = ({ close }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const preferencesSchema = Yup.object().shape({
    enabled: Yup.boolean(),
    apiKey: Yup.string().max(256).when('enabled', {
      is: true,
      then: (schema) => schema.required('API key is required when AI is enabled'),
      otherwise: (schema) => schema
    })
  });

  const formik = useFormik({
    initialValues: {
      enabled: get(preferences, 'ai.enabled', false),
      apiKey: get(preferences, 'ai.apiKey', '')
    },
    validationSchema: preferencesSchema,
    onSubmit: async (values) => {
      try {
        const newPreferences = await preferencesSchema.validate(values, { abortEarly: true });
        handleSave(newPreferences);
      } catch (error) {
        console.error('AI preferences validation error:', error.message);
      }
    }
  });

  const handleSave = useCallback(
    (newPreferences) => {
      dispatch(
        savePreferences({
          ...preferences,
          ai: {
            enabled: newPreferences.enabled,
            apiKey: newPreferences.apiKey
          }
        })
      ).catch((err) => console.log(err) && toast.error('Failed to update AI preferences'));
    },
    [dispatch, preferences]
  );

  const debouncedSave = useCallback(
    debounce((values) => {
      preferencesSchema
        .validate(values, { abortEarly: true })
        .then((validatedValues) => {
          handleSave(validatedValues);
        })
        .catch((error) => {
          // Don't save if validation fails
        });
    }, 500),
    [handleSave]
  );

  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      debouncedSave(formik.values);
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [formik.values, formik.dirty, formik.isValid, debouncedSave]);

  return (
    <StyledWrapper>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <h3 className="text-lg font-medium mb-4">AI Code Completion</h3>
        <p className="text-sm opacity-70 mb-4">
          Enable AI-powered code suggestions in the script editor. Requires an OpenAI API key.
        </p>

        <div className="flex items-center my-4">
          <input
            id="aiEnabled"
            type="checkbox"
            name="enabled"
            checked={formik.values.enabled}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="aiEnabled">
            Enable AI Code Suggestions
          </label>
        </div>

        <div className={`flex flex-col mt-4 ${!formik.values.enabled ? 'opacity-50' : ''}`}>
          <label className="block select-none mb-2" htmlFor="apiKey">
            OpenAI API Key
          </label>
          <div className="api-key-input-wrapper">
            <input
              type={apiKeyVisible ? 'text' : 'password'}
              name="apiKey"
              id="apiKey"
              className="block textbox w-full api-key-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.apiKey}
              disabled={!formik.values.enabled}
              placeholder="sk-..."
            />
            <button
              type="button"
              className="toggle-visibility-btn"
              onClick={() => setApiKeyVisible(!apiKeyVisible)}
              disabled={!formik.values.enabled}
              tabIndex={-1}
            >
              {apiKeyVisible ? <IconEyeOff size={18} strokeWidth={1.5} /> : <IconEye size={18} strokeWidth={1.5} />}
            </button>
          </div>
          <p className="text-xs opacity-60 mt-2">
            Your API key is stored locally and never sent to Bruno servers.
          </p>
        </div>

        {formik.values.enabled && formik.errors.apiKey ? (
          <div className="text-red-500 mt-2 text-sm">{formik.errors.apiKey}</div>
        ) : null}
      </form>
    </StyledWrapper>
  );
};

export default AISettings;
