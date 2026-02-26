import React from 'react';
import { rgba } from 'polished';
import { IconBrightnessUp, IconMoon, IconDeviceDesktop } from '@tabler/icons';
import themes, { getLightThemes, getDarkThemes } from 'themes/index';
import StyledWrapper from './StyledWrapper';

const themeModes = [
  { key: 'light', label: 'Light', icon: IconBrightnessUp },
  { key: 'dark', label: 'Dark', icon: IconMoon },
  { key: 'system', label: 'System', icon: IconDeviceDesktop }
];

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

const ThemeStep = ({ storedTheme, setStoredTheme, themeVariantLight, setThemeVariantLight, themeVariantDark, setThemeVariantDark }) => {
  const lightThemeList = getLightThemes();
  const darkThemeList = getDarkThemes();

  const showLight = storedTheme === 'light' || storedTheme === 'system';
  const showDark = storedTheme === 'dark' || storedTheme === 'system';

  return (
    <StyledWrapper className="step-body">
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
    </StyledWrapper>
  );
};

export default ThemeStep;
