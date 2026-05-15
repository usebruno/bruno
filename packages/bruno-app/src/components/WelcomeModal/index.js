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
import { useTranslation } from 'react-i18next';

const TOTAL_STEPS = 4;

const WelcomeModal = ({ onDismiss, onImportCollection, onCreateCollection, onOpenCollection, onStartRequest }) => {
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
  const { t } = useTranslation();

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

  const persistPreferences = () => {
    if (collectionLocation && collectionLocation !== defaultLocation) {
      const updatedPreferences = {
        ...preferences,
        general: {
          ...preferences.general,
          defaultLocation: collectionLocation
        }
      };
      return dispatch(savePreferences(updatedPreferences)).catch(() => {
        toast.error(t('WELCOME.FAILED_SAVE_PREFERENCES'));
      });
    }
    return Promise.resolve();
  };

  const handleSaveAndDismiss = () => {
    persistPreferences().finally(() => {
      onDismiss();
    });
  };

  const handleActionAndDismiss = (action) => () => {
    persistPreferences().finally(() => {
      onDismiss();
      action();
    });
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
      onCreateCollection={handleActionAndDismiss(onCreateCollection)}
      onImportCollection={handleActionAndDismiss(onImportCollection)}
      onOpenCollection={handleActionAndDismiss(onOpenCollection)}
      onStartRequest={handleActionAndDismiss(onStartRequest)}
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
            {step === 1 ? t('WELCOME.WELCOME_TITLE') : step === 4 ? t('WELCOME.READY_TITLE') : t('WELCOME.SETUP_TITLE')}
          </h1>
          {step === 1 && (
            <p className="welcome-tagline">
              {t('WELCOME.TAGLINE')}
            </p>
          )}
        </div>

        {steps[step - 1]}

        <div className="welcome-footer">
          <div className="progress-dots">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <button
                type="button"
                key={i}
                className={`dot ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'completed' : ''}`}
                onClick={() => goTo(i + 1)}
                aria-label={`${t('WELCOME.GO_STEP')} ${i + 1}`}
                aria-current={i + 1 === step ? 'step' : undefined}
              />
            ))}
          </div>

          <div className="footer-buttons">
            <Button type="button" color="secondary" variant="ghost" onClick={handleSaveAndDismiss}>
              {t('WELCOME.SKIP')}
            </Button>
            {step > 1 && (
              <Button type="button" color="secondary" variant="ghost" onClick={() => goTo(step - 1)}>
                {t('WELCOME.BACK')}
              </Button>
            )}
            {!isLastStep && (
              <Button type="button" onClick={() => goTo(step + 1)}>
                {step === 1 ? t('WELCOME.GET_STARTED') : t('WELCOME.NEXT')}
              </Button>
            )}
            {isLastStep && (
              <Button type="button" color="secondary" onClick={handleSaveAndDismiss}>
                {t('WELCOME.EXPLORE_OWN')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WelcomeModal;
