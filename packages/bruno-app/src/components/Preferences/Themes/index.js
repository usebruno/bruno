import React from 'react';
import { rgba } from 'polished';
import { useTheme } from 'providers/Theme';
import themes, { getLightThemes, getDarkThemes } from 'themes/index';
import { IconBrightnessUp, IconMoon, IconDeviceDesktop } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const ThemePreview = ({ themeId, isDark }) => {
  const theme = themes[themeId] || themes[isDark ? 'dark' : 'light'];

  const bgColor = theme.background.base;
  const sidebarColor = theme.sidebar.bg;
  const lineColor = rgba(theme.brand, 0.5);

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

  const themeModes = [
    { key: 'light', label: 'Light', icon: IconBrightnessUp },
    { key: 'dark', label: 'Dark', icon: IconMoon },
    { key: 'system', label: 'System', icon: IconDeviceDesktop }
  ];

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
        </div>

        <div className="flex gap-3 theme-mode-selector justify-start">
          {themeModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = storedTheme === mode.key;

            return (
              <button
                key={mode.key}
                onClick={() => handleModeChange(mode.key)}
                className={`theme-mode-option relative ${isSelected ? 'selected' : ''}`}
              >
                <div className="flex items-center justify-start gap-2">
                  <Icon size={16} strokeWidth={1.5} />
                  <span>{mode.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="section-divider" />

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
