import React, { useEffect, useCallback, useRef } from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';
import { IconFlask } from '@tabler/icons';
import get from 'lodash/get';
import { BETA_FEATURES as BETA_FEATURE_IDS } from 'utils/beta-features';

/**
 * UI metadata for beta features rendered in Preferences.
 * IDs must match keys from utils/beta-features.js BETA_FEATURES.
 */
const BETA_FEATURES = [
  {
    id: BETA_FEATURE_IDS.OPENAPI_SYNC,
    label: 'OpenAPI Sync',
    description: 'Synchronize your Bruno collection with an OpenAPI specification. Detect drift, review changes, and sync with a single click.'
  },
  {
    id: BETA_FEATURE_IDS.SIDEBAR_OPTIMIZATIONS,
    label: 'Sidebar Optimizations',
    description: 'Batches sidebar rendering updates for large collections. Reduces Redux dispatches from thousands to ~30, significantly improving load times for collections with 1000+ items.'
  },
  {
    id: BETA_FEATURE_IDS.SKIP_LOADING_BADGE_EVENT,
    label: 'Skip Loading Badge Event',
    description: 'Eliminates the redundant per-file loading indicator IPC event during BRU collection loading. Reduces IPC events from 3 to 2 per file in the worker thread path.'
  },
  {
    id: BETA_FEATURE_IDS.PARALLEL_WORKERS,
    label: 'Parallel Workers',
    description: 'Uses 4 parallel worker threads per lane instead of 1 for BRU file parsing. Distributes parsing work across multiple CPU cores for faster collection loading.'
  },
  {
    id: BETA_FEATURE_IDS.DEFERRED_PARSE,
    label: 'Deferred Parse',
    description: 'Only parses file metadata at mount time for instant sidebar rendering (~0.5s). Full request data is parsed on-demand when you click a file or run the collection.'
  }
];

const Beta = ({ close }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  // Generate validation schema dynamically from beta features
  const generateValidationSchema = () => {
    const schemaShape = {};
    BETA_FEATURES.forEach((feature) => {
      schemaShape[feature.id] = Yup.boolean();
    });
    return Yup.object().shape(schemaShape);
  };

  // Generate initial values dynamically from beta features
  const generateInitialValues = () => {
    const initialValues = {};
    BETA_FEATURES.forEach((feature) => {
      initialValues[feature.id] = get(preferences, `beta.${feature.id}`, false);
    });
    return initialValues;
  };

  const betaSchema = generateValidationSchema();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: generateInitialValues(),
    validationSchema: betaSchema,
    onSubmit: async (values) => {
      try {
        const newPreferences = await betaSchema.validate(values, { abortEarly: true });
        handleSave(newPreferences);
      } catch (error) {
        console.error('Beta preferences validation error:', error.message);
      }
    }
  });

  const handleSave = useCallback((newBetaPreferences) => {
    dispatch(
      savePreferences({
        ...preferences,
        beta: {
          ...preferences.beta,
          ...newBetaPreferences
        }
      })
    )
      .catch((err) => console.log(err) && toast.error('Failed to update beta preferences'));
  }, [dispatch, preferences]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const debouncedSave = useCallback(
    debounce((values) => {
      betaSchema.validate(values, { abortEarly: true })
        .then((validatedValues) => {
          handleSaveRef.current(validatedValues);
        })
        .catch((error) => {
        });
    }, 500),
    [betaSchema]
  );

  // Auto-save when form values change
  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      debouncedSave(formik.values);
    }
    return () => {
      debouncedSave.flush();
    };
  }, [formik.values, formik.dirty, formik.isValid, debouncedSave]);

  const hasAnyBetaFeatures = BETA_FEATURES.length > 0;

  return (
    <StyledWrapper>
      <div className="section-header">Beta Features</div>
      <form onSubmit={formik.handleSubmit}>
        <div className="mb-6">
          <p className="text-gray-500 dark:text-gray-400 mb-4 text-wrap">
            Beta features are experimental previews that may change before full release. Try them and share feedback.
          </p>
        </div>

        <div className="space-y-4">
          {BETA_FEATURES.map((feature) => (
            <div key={feature.id} className="beta-feature-item">
              <div className="flex items-center">
                <input
                  id={feature.id}
                  type="checkbox"
                  name={feature.id}
                  checked={formik.values[feature.id]}
                  onChange={formik.handleChange}
                  className="mousetrap mr-0"
                />
                <label className="block ml-2 select-none font-medium" htmlFor={feature.id}>
                  {feature.label}
                </label>
              </div>
              <div className="beta-feature-description ml-6 text-xs text-gray-500 dark:text-gray-400">
                {feature.description}
              </div>
            </div>
          ))}
        </div>

        {!hasAnyBetaFeatures && (
          <div className="no-features-message">
            <p>No beta features are currently available</p>
          </div>
        )}
      </form>
    </StyledWrapper>
  );
};

export default Beta;
