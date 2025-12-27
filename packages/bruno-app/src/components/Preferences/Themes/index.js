import React from 'react';
import { useTheme } from 'providers/Theme';
import { getLightThemes, getDarkThemes } from 'themes/index';
import StyledWrapper from './StyledWrapper';

const ThemePreview = ({ themeId, isDark }) => {
  const bgColor = isDark ? '#1e1e1e' : '#ffffff';
  const sidebarColor = isDark ? '#252526' : '#f8f8f8';
  const lineColor = isDark ? '#3d3d3d' : '#e5e5e5';

  return (
    <div className="theme-preview" style={{ background: bgColor, border: `1px solid ${lineColor}` }}>
      <div className="theme-preview-sidebar" style={{ background: sidebarColor }} />
      <div className="theme-preview-main">
        <div className="theme-preview-line" style={{ background: lineColor }} />
        <div className="theme-preview-line" style={{ background: lineColor, width: '60%' }} />
        <div className="theme-preview-line" style={{ background: lineColor, width: '70%' }} />
      </div>
    </div>
  );
};

const ThemeVariantCard = ({ theme, isSelected, onClick }) => {
  const isDark = theme.mode === 'dark';

  return (
    <div className={`theme-variant-card ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <ThemePreview themeId={theme.id} isDark={isDark} />
      <span className="theme-variant-name">{theme.name}</span>
    </div>
  );
};

const Themes = () => {
  const {
    storedTheme,
    setStoredTheme,
    themeVariantLight,
    setThemeVariantLight,
    themeVariantDark,
    setThemeVariantDark
  } = useTheme();

  const lightThemes = getLightThemes();
  const darkThemes = getDarkThemes();

  const handleModeChange = (mode) => {
    setStoredTheme(mode);
  };

  const renderThemeVariants = (themes, selectedVariant, onSelect, label) => (
    <div className="theme-variant-section">
      <div className="theme-variant-label">{label}</div>
      <div className="theme-variants">
        {themes.map((theme) => (
          <ThemeVariantCard
            key={theme.id}
            theme={theme}
            isSelected={selectedVariant === theme.id}
            onClick={() => onSelect(theme.id)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <StyledWrapper>
      <div className="flex flex-col gap-4 w-full">
        <div>
          <div className="section-header">Appearance</div>
          <div className="theme-mode-selector">
            <label className="theme-mode-option">
              <input
                type="radio"
                name="theme-mode"
                value="light"
                checked={storedTheme === 'light'}
                onChange={() => handleModeChange('light')}
              />
              <span>Light</span>
            </label>
            <label className="theme-mode-option">
              <input
                type="radio"
                name="theme-mode"
                value="dark"
                checked={storedTheme === 'dark'}
                onChange={() => handleModeChange('dark')}
              />
              <span>Dark</span>
            </label>
            <label className="theme-mode-option">
              <input
                type="radio"
                name="theme-mode"
                value="system"
                checked={storedTheme === 'system'}
                onChange={() => handleModeChange('system')}
              />
              <span>System</span>
            </label>
          </div>
        </div>

        {storedTheme === 'light' && (
          <>
            {renderThemeVariants(lightThemes, themeVariantLight, setThemeVariantLight, 'Light Theme')}
          </>
        )}

        {storedTheme === 'dark' && (
          <>
            {renderThemeVariants(darkThemes, themeVariantDark, setThemeVariantDark, 'Dark Theme')}
          </>
        )}

        {storedTheme === 'system' && (
          <>
            {renderThemeVariants(lightThemes, themeVariantLight, setThemeVariantLight, 'Light Theme')}
            <div className="section-divider" />
            {renderThemeVariants(darkThemes, themeVariantDark, setThemeVariantDark, 'Dark Theme')}
          </>
        )}
      </div>
    </StyledWrapper>
  );
};

export default Themes;
