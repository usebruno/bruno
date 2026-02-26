import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import get from 'lodash/get';
import toast from 'react-hot-toast';
import Bruno from 'components/Bruno';
import Button from 'ui/Button';
import { useTheme } from 'providers/Theme';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import WelcomeStep from './WelcomeStep';
import ThemeStep from './ThemeStep';
import StorageStep from './StorageStep';
import GetStartedStep from './GetStartedStep';
import StyledWrapper from './StyledWrapper';

const TOTAL_STEPS = 4;

const WelcomeModal = ({ onDismiss, onImportCollection, onCreateCollection, onOpenCollection }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const defaultLocation = get(preferences, 'general.defaultLocation', '');
  const {
    storedTheme,
    setStoredTheme,
    themeVariantLight,
    setThemeVariantLight,
    themeVariantDark,
    setThemeVariantDark
  } = useTheme();

  const [step, setStep] = useState(1);
  const [collectionLocation, setCollectionLocation] = useState(defaultLocation);

  const handleBrowse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          setCollectionLocation(dirPath);
        }
      })
      .catch(() => {});
  };

  const handleSaveAndDismiss = () => {
    if (collectionLocation && collectionLocation !== defaultLocation) {
      const updatedPreferences = {
        ...preferences,
        general: {
          ...preferences.general,
          defaultLocation: collectionLocation
        }
      };
      dispatch(savePreferences(updatedPreferences))
        .then(() => onDismiss())
        .catch(() => {
          toast.error('Failed to save preferences');
          onDismiss();
        });
    } else {
      onDismiss();
    }
  };

  const goTo = (s) => setStep(s);

  const steps = [
    <WelcomeStep key="welcome" />,
    <ThemeStep
      key="theme"
      storedTheme={storedTheme}
      setStoredTheme={setStoredTheme}
      themeVariantLight={themeVariantLight}
      setThemeVariantLight={setThemeVariantLight}
      themeVariantDark={themeVariantDark}
      setThemeVariantDark={setThemeVariantDark}
    />,
    <StorageStep
      key="storage"
      collectionLocation={collectionLocation}
      onBrowse={handleBrowse}
    />,
    <GetStartedStep
      key="getstarted"
      onCreateCollection={onCreateCollection}
      onImportCollection={onImportCollection}
      onOpenCollection={onOpenCollection}
    />
  ];

  const isLastStep = step === TOTAL_STEPS;

  return (
    <StyledWrapper data-testid="welcome-modal">
      <div className="welcome-card">
        <div className="welcome-header">
          <div className="logo-container">
            <Bruno width={48} />
          </div>
          <h1 className="welcome-heading">
            {step === 1 ? 'Welcome to Bruno' : step === 4 ? 'Ready to go!' : 'Set up Bruno'}
          </h1>
          {step === 1 && (
            <p className="welcome-tagline">
              A fast, Git-friendly, and open-source API client.
            </p>
          )}
        </div>

        {steps[step - 1]}

        <div className="welcome-footer">
          <div className="progress-dots">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`dot ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'completed' : ''}`}
                onClick={() => goTo(i + 1)}
              />
            ))}
          </div>

          <div className="footer-buttons">
            <Button type="button" color="secondary" variant="ghost" onClick={handleSaveAndDismiss}>
              Skip
            </Button>
            {step > 1 && (
              <Button type="button" color="secondary" variant="ghost" onClick={() => goTo(step - 1)}>
                Back
              </Button>
            )}
            {!isLastStep && (
              <Button type="button" onClick={() => goTo(step + 1)}>
                {step === 1 ? 'Get Started' : 'Next'}
              </Button>
            )}
            {isLastStep && (
              <Button type="button" color="secondary" onClick={handleSaveAndDismiss}>
                I'll explore on my own
              </Button>
            )}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WelcomeModal;
