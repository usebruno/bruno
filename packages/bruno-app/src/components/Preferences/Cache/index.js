import React, { useEffect, useCallback, useRef } from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import {
  savePreferences,
  clearHttpHttpsAgentCache
} from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import debounce from 'lodash/debounce';
import get from 'lodash/get';

const cacheSchema = Yup.object().shape({
  httpHttpsAgents: Yup.object({
    enabled: Yup.boolean()
  })
});

const Cache = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const handleSave = useCallback(
    (newCachePreferences) => {
      dispatch(
        savePreferences({
          ...preferences,
          cache: newCachePreferences
        })
      ).catch(() => toast.error('Failed to update cache preferences'));
    },
    [dispatch, preferences]
  );

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const formik = useFormik({
    initialValues: {
      httpHttpsAgents: {
        enabled: get(preferences, 'cache.httpHttpsAgents.enabled', true)
      }
    },
    validationSchema: cacheSchema,
    onSubmit: async (values) => {
      try {
        const newPreferences = await cacheSchema.validate(values, { abortEarly: true });
        handleSave(newPreferences);
      } catch (error) {
        console.error('Cache preferences validation error:', error.message);
      }
    }
  });

  const debouncedSave = useCallback(
    debounce((values) => {
      cacheSchema
        .validate(values, { abortEarly: true })
        .then((validatedValues) => handleSaveRef.current(validatedValues))
        .catch(() => {});
    }, 500),
    []
  );

  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      debouncedSave(formik.values);
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [formik.values, formik.dirty, formik.isValid, debouncedSave]);

  const handleAgentCachingChange = (e) => {
    formik.handleChange(e);
    // Immediately evict all cached agents when caching is disabled
    if (!e.target.checked) {
      dispatch(clearHttpHttpsAgentCache()).catch(() => {});
    }
  };

  const handleResetCache = () => {
    dispatch(clearHttpHttpsAgentCache())
      .then(() => toast.success('Agent cache cleared'))
      .catch(() => toast.error('Failed to clear agent cache'));
  };

  return (
    <StyledWrapper className="w-full">
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="section-title mt-6 mb-3">HTTP and HTTPS Agents Cache</div>

        <div className="flex items-center my-2">
          <input
            id="httpHttpsAgents.enabled"
            type="checkbox"
            name="httpHttpsAgents.enabled"
            checked={formik.values.httpHttpsAgents.enabled}
            onChange={handleAgentCachingChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="httpHttpsAgents.enabled">
            Enable HTTP/HTTPS agent caching
          </label>
        </div>
        <div className="text-xs mt-1 ml-6 opacity-70">
          Reuses TLS sessions and connections across requests for better performance. Disable to create a fresh agent
          for every request.
        </div>

        <div className="mt-6">
          <button type="button" className="btn btn-sm btn-secondary" onClick={handleResetCache}>
            Reset Cache
          </button>
          <div className="text-xs mt-1 opacity-70">Destroys all cached agents and their connections.</div>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default Cache;
