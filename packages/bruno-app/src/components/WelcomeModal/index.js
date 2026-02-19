import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { rgba } from 'polished';
import {
  IconPlus,
  IconDownload,
  IconFileImport,
  IconBrightnessUp,
  IconMoon,
  IconDeviceDesktop,
  IconGitFork,
  IconLock,
  IconFolder as IconFolderTabler,
  IconRocket,
  IconSend
} from '@tabler/icons';
import toast from 'react-hot-toast';
import Bruno from 'components/Bruno';
import Button from 'ui/Button';
import { useTheme } from 'providers/Theme';
import themes, { getLightThemes, getDarkThemes } from 'themes/index';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { getDefaultCollectionLocation } from 'utils/common/platform';
import StyledWrapper from './StyledWrapper';

const TOTAL_STEPS = 4;

const ThemePreviewBox = ({ themeId, isDark }) => {
  const themeData = themes[themeId] || themes[isDark ? 'dark' : 'light'];
  const bgColor = themeData.background.base;
  const sidebarColor = themeData.sidebar.bg;
  const lineColor = rgba(themeData.brand, 0.5);

  return (
    <div className="theme-preview-box" style={{ background: bgColor, border: `1px solid ${lineColor}` }}>
      <div className="preview-sidebar" style={{ background: sidebarColor }} />
      <div className="preview-main">
        <div className="preview-line" style={{ background: lineColor, width: '80%' }} />
        <div className="preview-line" style={{ background: lineColor, width: '55%' }} />
        <div className="preview-line" style={{ background: lineColor, width: '70%' }} />
      </div>
    </div>
  );
};

const WelcomeModal = ({ onDismiss, onImportCollection, onCreateCollection, onOpenCollection, onCreateRequest }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const {
    storedTheme,
    setStoredTheme,
    themeVariantLight,
    setThemeVariantLight,
    themeVariantDark,
    setThemeVariantDark
  } = useTheme();

  const [step, setStep] = useState(1);
  const [collectionLocation, setCollectionLocation] = useState(getDefaultCollectionLocation());

  const lightThemeList = getLightThemes();
  const darkThemeList = getDarkThemes();

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
    if (collectionLocation) {
      const updatedPreferences = {
        ...preferences,
        general: {
          ...preferences.general,
          defaultCollectionLocation: collectionLocation
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

  /* ─── Step 1: Welcome / About Bruno ─── */
  const renderStep1 = () => (
    <div className="step-body">
      <div className="highlights">
        <div className="highlight-item">
          <div className="highlight-icon">
            <IconFolderTabler size={18} stroke={1.5} />
          </div>
          <div>
            <div className="highlight-title">Filesystem-first</div>
            <div className="highlight-desc">Collections are plain files on your disk. No cloud sync, no proprietary lock-in. Your data stays yours.</div>
          </div>
        </div>

        <div className="highlight-item">
          <div className="highlight-icon">
            <IconGitFork size={18} stroke={1.5} />
          </div>
          <div>
            <div className="highlight-title">Git-friendly</div>
            <div className="highlight-desc">Every request is a readable file. Commit, branch, review, and collaborate using the tools you already know.</div>
          </div>
        </div>

        <div className="highlight-item">
          <div className="highlight-icon">
            <IconLock size={18} stroke={1.5} />
          </div>
          <div>
            <div className="highlight-title">Privacy-focused</div>
            <div className="highlight-desc">No accounts required. No telemetry. Bruno works entirely offline — your API keys never leave your machine.</div>
          </div>
        </div>

        <div className="highlight-item">
          <div className="highlight-icon">
            <IconRocket size={18} stroke={1.5} />
          </div>
          <div>
            <div className="highlight-title">Fast and lightweight</div>
            <div className="highlight-desc">Built to be snappy. No bloated runtimes — just a fast, focused tool for exploring and testing APIs.</div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Step 2: Theme ─── */
  const renderStep2 = () => {
    const themeModes = [
      { key: 'light', label: 'Light', icon: IconBrightnessUp },
      { key: 'dark', label: 'Dark', icon: IconMoon },
      { key: 'system', label: 'System', icon: IconDeviceDesktop }
    ];

    const showLight = storedTheme === 'light' || storedTheme === 'system';
    const showDark = storedTheme === 'dark' || storedTheme === 'system';

    return (
      <div className="step-body">
        <div className="step-label">Appearance</div>
        <div className="step-title">Choose your theme</div>
        <div className="step-description">
          Pick a look that feels right. You can always change this later in Preferences.
        </div>

        <div className="theme-mode-buttons">
          {themeModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.key}
                className={`theme-mode-btn ${storedTheme === mode.key ? 'active' : ''}`}
                onClick={() => setStoredTheme(mode.key)}
              >
                <Icon size={16} stroke={1.5} />
                {mode.label}
              </button>
            );
          })}
        </div>

        {showLight && (
          <div className="theme-variants-grid" style={{ marginBottom: showDark ? '1rem' : 0 }}>
            {lightThemeList.map((t) => (
              <div
                key={t.id}
                className={`theme-variant-option ${themeVariantLight === t.id ? 'selected' : ''}`}
                onClick={() => setThemeVariantLight(t.id)}
              >
                <ThemePreviewBox themeId={t.id} isDark={false} />
                <span className="variant-name">{t.name}</span>
              </div>
            ))}
          </div>
        )}

        {showDark && (
          <div className="theme-variants-grid">
            {darkThemeList.map((t) => (
              <div
                key={t.id}
                className={`theme-variant-option ${themeVariantDark === t.id ? 'selected' : ''}`}
                onClick={() => setThemeVariantDark(t.id)}
              >
                <ThemePreviewBox themeId={t.id} isDark={true} />
                <span className="variant-name">{t.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ─── Step 3: Collection Location ─── */
  const renderStep3 = () => (
    <div className="step-body">
      <div className="step-label">Storage</div>
      <div className="step-title">Where should we store your collections?</div>
      <div className="step-description">
        Bruno saves collections as plain files on your filesystem — perfect for version control with Git.
      </div>

      <div className="location-input-group">
        <div className="location-path-display" onClick={handleBrowse} role="button" tabIndex={0}>
          {collectionLocation ? (
            <span className="path-text">{collectionLocation}</span>
          ) : (
            <span className="path-text path-placeholder">Click to choose a folder...</span>
          )}
          <span className="browse-label">Browse</span>
        </div>
      </div>
      <div className="location-hint">
        Each collection gets its own folder inside this directory. You can change this per-collection later.
      </div>
    </div>
  );

  /* ─── Step 4: Actions ─── */
  const renderStep4 = () => (
    <div className="step-body">
      <div className="step-label">Your first collection</div>
      <div className="step-title">You're all set! What's next?</div>
      <div className="step-description">
        Create a new collection to start building requests, or import one you already have.
      </div>

      <div className="primary-actions">
        <button className="primary-action-card" onClick={onCreateCollection}>
          <div className="card-icon">
            <IconPlus size={20} stroke={1.5} />
          </div>
          <div className="card-title">Create Collection</div>
          <div className="card-desc">Start fresh with a new API collection</div>
        </button>

        <button className="primary-action-card" onClick={onImportCollection}>
          <div className="card-icon">
            <IconDownload size={20} stroke={1.5} />
          </div>
          <div className="card-title">Import Collection</div>
          <div className="card-desc">Bring in Postman, OpenAPI, or Insomnia</div>
        </button>
      </div>

      <div className="secondary-actions">
        <button className="secondary-action" onClick={onOpenCollection}>
          <span className="secondary-icon">
            <IconFileImport size={16} stroke={1.5} />
          </span>
          <div>
            <div className="secondary-label">Open existing collection</div>
            <div className="secondary-desc">Open a Bruno collection from your filesystem</div>
          </div>
        </button>

        <button className="secondary-action highlighted" onClick={onCreateRequest}>
          <span className="secondary-icon">
            <IconSend size={16} stroke={1.5} />
          </span>
          <div>
            <div className="secondary-label">Create first request</div>
            <div className="secondary-desc">Jump right in — open a new request tab and start testing</div>
          </div>
        </button>
      </div>
    </div>
  );

  const steps = [renderStep1, renderStep2, renderStep3, renderStep4];
  const isLastStep = step === TOTAL_STEPS;

  return (
    <StyledWrapper>
      <div className="welcome-card">
        {/* ─── Header ─── */}
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

        {/* ─── Step content ─── */}
        {steps[step - 1]()}

        {/* ─── Footer ─── */}
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
