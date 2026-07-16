import React, { useEffect, useCallback, useRef } from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences, updateActivePreferencesTab } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconArrowRight, IconExternalLink } from '@tabler/icons';
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
 *   - docsUrl     (optional) URL to the documentation for the feature.
 *   - action      (optional) object with { label, tab } to render a button that navigates to a specific preferences tab. The label is the button text, and the tab is the tab key (e.g. 'ai', 'cache').
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
    id: BETA_FEATURE_IDS.AI_ASSISTANT,
    label: 'AI Assistant',
    description:
      'Generate scripts, tests, and documentation directly from the request tab. Includes contextual chat, scripting autocomplete, and support for OpenAI, Anthropic, and OpenAI-compatible providers using your own API key.',
    action: { label: 'Go to AI settings', tab: 'ai' },
    docsUrl: 'https://docs.usebruno.com/ai'
  },
  {
    id: BETA_FEATURE_IDS.FILE_CACHE,
    label: 'File cache',
    description:
      'Speeds up how quickly your collections open by keeping a local cache on disk. Turn it on or clear it anytime from the Cache settings.',
    action: { label: 'Go to Cache settings', tab: 'cache' }
  },
  {
    id: BETA_FEATURE_IDS.AKAMAI_EDGEGRID,
    label: 'Akamai EdgeGrid',
    description:
      'Sign requests with the Akamai EdgeGrid authentication scheme. Select it from the Auth type dropdown on any request, folder, or collection.',
    docsUrl: 'https://docs.usebruno.com/auth/akamai-edgegrid'
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

  const goToTab = useCallback((tab) => {
    dispatch(updateActivePreferencesTab({ tab }));
  }, [dispatch]);

  return (
    <StyledWrapper>
      <div className="section-header">Beta Features</div>
      <form onSubmit={formik.handleSubmit}>
        <div className="mb-6">
          <p className="text-gray-500 dark:text-gray-400 mb-4 text-wrap">
            Beta features are experimental previews that may change before full release. Try them and share feedback.
          </p>
        </div>

        <div className="beta-feature-list">
          {BETA_FEATURES.map((feature) => (
            <div key={feature.id} className="beta-feature-item">
              <div className="beta-feature-header">
                <span className="beta-feature-title select-none font-medium" id={`${feature.id}-label`}>
                  {feature.label}
                </span>
              </div>
              <div className="beta-feature-description text-xs text-gray-500 dark:text-gray-400">
                {feature.description}
              </div>
              {(feature.action || feature.docsUrl) && (
                <div className="beta-feature-links">
                  {feature.action && (
                    <button
                      type="button"
                      className="beta-feature-link"
                      onClick={() => goToTab(feature.action.tab)}
                    >
                      <span>{feature.action.label}</span>
                      <IconArrowRight size={14} strokeWidth={1.5} />
                    </button>
                  )}
                  {feature.docsUrl && (
                    <a
                      className="beta-feature-link"
                      href={feature.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>View docs</span>
                      <IconExternalLink size={14} strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              )}
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
