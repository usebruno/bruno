import React from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { IconFlask } from '@tabler/icons';
import get from 'lodash/get';

// Beta features configuration
const BETA_FEATURES = [
  {
    id: 'websocket',
    label: 'Web Socket Support',
    description: 'Enable Web Socket request support for making realtime calls to services'
  },
  {
    id: 'nodevm',
    label: 'Node VM Runtime',
    description: 'Enable Node VM runtime for JavaScript execution in Developer Mode'
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

  const handleSave = (newBetaPreferences) => {
    dispatch(
      savePreferences({
        ...preferences,
        beta: newBetaPreferences
      })
    )
      .then(() => {
        toast.success('Beta preferences saved successfully');
        close();
      })
      .catch((err) => console.log(err) && toast.error('Failed to update beta preferences'));
  };

  const hasAnyBetaFeatures = BETA_FEATURES.length > 0;

  return (
    <StyledWrapper>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <IconFlask size={20} className="mr-2 text-orange-500" />
            <h2 className="text-lg font-semibold">Beta Features</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-wrap">
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

        <div className="mt-10">
          <button type="submit" className="submit btn btn-sm btn-secondary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default Beta;
