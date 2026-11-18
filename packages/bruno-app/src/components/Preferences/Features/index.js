import React, { useEffect, useRef } from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';
import { get } from 'lodash';

const Features = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const preferencesSchema = Yup.object().shape({
    enhancedSearch: Yup.boolean()
  });

  const formik = useFormik({
    initialValues: {
      enhancedSearch: get(preferences, 'features.enhancedSearch', true)
    },
    validationSchema: preferencesSchema
  });

  const debouncedSave = useRef(
    debounce((values, currentPreferences) => {
      preferencesSchema
        .validate(values, { abortEarly: true })
        .then((validatedValues) => {
          dispatch(
            savePreferences({
              ...currentPreferences,
              features: {
                ...currentPreferences.features,
                enhancedSearch: validatedValues.enhancedSearch
              }
            })
          ).catch((err) => console.log(err) && toast.error('Failed to update preferences'));
        })
        .catch(() => {});
    }, 500)
  ).current;

  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      debouncedSave(formik.values, preferences);
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [formik.values, formik.dirty, formik.isValid, preferences]);

  return (
    <StyledWrapper>
      <div className="section-header">Features</div>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="text-xs muted">Turn on/off additional features.</div>
        <div className="flex items-center mt-4">
          <input
            id="enhancedSearch"
            type="checkbox"
            name="enhancedSearch"
            checked={formik.values.enhancedSearch}
            onChange={formik.handleChange}
            className="mousetrap mr-0"
            data-testid="features.enhancedSearch"
          />
          <label className="flex items-center gap-2 ml-2 select-none" htmlFor="enhancedSearch">
            Enhanced Search
            <span className="beta-badge">Beta</span>
          </label>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default Features;
