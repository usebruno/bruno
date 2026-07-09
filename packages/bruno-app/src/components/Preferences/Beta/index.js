import React, { useEffect, useCallback, useRef } from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';
import get from 'lodash/get';
// Commented out while there are no active beta features. Re-enable this import when
// adding a beta feature its keys are then referenced as BETA_FEATURE_IDS.MY_FEATURE in the BETA_FEATURES array.
import { BETA_FEATURES as BETA_FEATURE_IDS } from 'utils/beta-features';

/**
 * UI metadata for the Beta Features section in Preferences — one entry per toggle.
 * The whole tab is data-driven from this array: the form fields, validation schema,
 * initial values and the rendered checkboxes are all generated from it.
 *
 * Each entry has the shape { id, label, description }:
 *   - id          (required) the feature key. MUST be a value from BETA_FEATURES in
 *                 utils/beta-features.js (imported here as BETA_FEATURE_IDS). It is
 *                 used as the preference key (preferences.beta[id]), the form field
 *                 name and the checkbox id, so it must be stable and unique.
 *   - label       (required) short name shown next to the checkbox.
 *   - description (required) one-line explanation shown under the label.
 *
 * To add a beta feature:
 *   1. Add its key to BETA_FEATURES in utils/beta-features.js (e.g. MY_FEATURE: 'my-feature').
 *   2. Add an entry to the array below using BETA_FEATURE_IDS.MY_FEATURE.
 *   3. Gate the feature in code with useBetaFeature(BETA_FEATURES.MY_FEATURE).
 *
 * When the array is empty, the Beta tab shows "No beta features are currently available",
 * so a feature can be hidden by simply removing or commenting out its entry.
 */
const BETA_FEATURES = [

  {
    id: BETA_FEATURE_IDS.MOCK_SERVER,
    label: 'Mock Server',
    description: 'Run a local mock server using response examples defined in your collection. Serve mock API responses for frontend development without a real backend.'
  }
  // {
  //   id: BETA_FEATURE_IDS.OPENAPI_SYNC,
  //   label: 'OpenAPI Sync',
  //   description: 'Synchronize your Bruno collection with an OpenAPI specification. Detect drift, review changes, and sync with a single click.'
  // }
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

  const mockServerMode = get(preferences, 'mockServer.mode', 'isolated');

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

  const handleMockModeChange = (mode) => {
    dispatch(
      savePreferences({
        ...preferences,
        mockServer: {
          ...preferences.mockServer,
          mode
        }
      })
    ).catch(() => toast.error('Failed to update mock server preferences'));
  };

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

        {/* {formik.values[BETA_FEATURE_IDS.MOCK_SERVER] && (
          <div className="mock-server-settings mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="section-header mb-3">Mock Server</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Choose how mock servers listen on localhost. Isolated mode uses one port per collection. Shared gateway uses one port for all collections with a collection slug prefix in the URL.
            </p>
            <div className="space-y-2">
              <label className="flex items-center select-none">
                <input
                  type="radio"
                  name="mockServerMode"
                  value="isolated"
                  checked={mockServerMode === 'isolated'}
                  onChange={() => handleMockModeChange('isolated')}
                  className="mr-2"
                />
                Isolated (default)
              </label>
              <label className="flex items-center select-none">
                <input
                  type="radio"
                  name="mockServerMode"
                  value="shared"
                  checked={mockServerMode === 'shared'}
                  onChange={() => handleMockModeChange('shared')}
                  className="mr-2"
                />
                Shared gateway
              </label>
            </div>
          </div>
        )} */}

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
