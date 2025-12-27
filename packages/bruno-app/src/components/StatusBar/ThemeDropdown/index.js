import React, { useState } from 'react';
import Tippy from '@tippyjs/react';
import { IconChevronRight, IconCheck, IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import { useTheme } from 'providers/Theme';
import { getLightThemes, getDarkThemes } from 'themes/index';
import StyledWrapper from './StyledWrapper';

const ThemeDropdown = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lightSubmenuOpen, setLightSubmenuOpen] = useState(false);
  const [darkSubmenuOpen, setDarkSubmenuOpen] = useState(false);
  const [tooltipEnabled, setTooltipEnabled] = useState(true);

  const {
    storedTheme,
    setStoredTheme,
    themeVariantLight,
    themeVariantDark,
    setThemeVariantLight,
    setThemeVariantDark
  } = useTheme();

  const lightThemes = getLightThemes();
  const darkThemes = getDarkThemes();

  const handleModeSelect = (mode) => {
    setStoredTheme(mode);
  };

  const handleThemeSelect = (themeId, isLight) => {
    if (isLight) {
      setThemeVariantLight(themeId);
    } else {
      setThemeVariantDark(themeId);
    }
    setIsOpen(false);
    setLightSubmenuOpen(false);
    setDarkSubmenuOpen(false);
  };

  const renderSubmenu = (themes, isLight, currentVariant) => (
    <div className="submenu">
      {themes.map((theme) => (
        <div
          key={theme.id}
          className={`menu-item ${currentVariant === theme.id ? 'active' : ''}`}
          onClick={() => handleThemeSelect(theme.id, isLight)}
        >
          <span className="menu-item-label">{theme.name}</span>
          {currentVariant === theme.id && (
            <IconCheck size={14} strokeWidth={2} className="check-icon" />
          )}
        </div>
      ))}
    </div>
  );

  const menuContent = (
    <StyledWrapper>
      <div className="theme-menu">
        {/* Mode Section */}
        <div className="menu-label">Mode</div>
        <div
          className={`menu-item ${storedTheme === 'light' ? 'active' : ''}`}
          onClick={() => handleModeSelect('light')}
        >
          <IconSun size={14} strokeWidth={1.5} className="menu-item-icon" />
          <span className="menu-item-label">Light</span>
          {storedTheme === 'light' && (
            <IconCheck size={14} strokeWidth={2} className="check-icon" />
          )}
        </div>
        <div
          className={`menu-item ${storedTheme === 'dark' ? 'active' : ''}`}
          onClick={() => handleModeSelect('dark')}
        >
          <IconMoon size={14} strokeWidth={1.5} className="menu-item-icon" />
          <span className="menu-item-label">Dark</span>
          {storedTheme === 'dark' && (
            <IconCheck size={14} strokeWidth={2} className="check-icon" />
          )}
        </div>
        <div
          className={`menu-item ${storedTheme === 'system' ? 'active' : ''}`}
          onClick={() => handleModeSelect('system')}
        >
          <IconDeviceDesktop size={14} strokeWidth={1.5} className="menu-item-icon" />
          <span className="menu-item-label">System</span>
          {storedTheme === 'system' && (
            <IconCheck size={14} strokeWidth={2} className="check-icon" />
          )}
        </div>

        <div className="menu-divider" />

        {/* Light Themes with Submenu */}
        <Tippy
          content={renderSubmenu(lightThemes, true, themeVariantLight)}
          placement="right-start"
          interactive={true}
          arrow={false}
          offset={[0, 2]}
          animation={false}
          visible={lightSubmenuOpen}
          onClickOutside={() => setLightSubmenuOpen(false)}
          appendTo="parent"
        >
          <div
            className="menu-item has-submenu"
            onMouseEnter={() => {
              setLightSubmenuOpen(true);
              setDarkSubmenuOpen(false);
            }}
          >
            <span className="menu-item-label">Light Themes</span>
            <IconChevronRight size={14} strokeWidth={2} className="chevron-icon" />
          </div>
        </Tippy>

        {/* Dark Themes with Submenu */}
        <Tippy
          content={renderSubmenu(darkThemes, false, themeVariantDark)}
          placement="right-start"
          interactive={true}
          arrow={false}
          offset={[0, 2]}
          animation={false}
          visible={darkSubmenuOpen}
          onClickOutside={() => setDarkSubmenuOpen(false)}
          appendTo="parent"
        >
          <div
            className="menu-item has-submenu"
            onMouseEnter={() => {
              setDarkSubmenuOpen(true);
              setLightSubmenuOpen(false);
            }}
          >
            <span className="menu-item-label">Dark Themes</span>
            <IconChevronRight size={14} strokeWidth={2} className="chevron-icon" />
          </div>
        </Tippy>
      </div>
    </StyledWrapper>
  );

  const handleOpen = () => {
    setTooltipEnabled(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setLightSubmenuOpen(false);
    setDarkSubmenuOpen(false);
    // Small delay before re-enabling tooltip to prevent flash
    setTimeout(() => setTooltipEnabled(true), 100);
  };

  return (
    <ToolHint text="Theme" toolhintId="ThemeDropdown" place="top" offset={10} hidden={!tooltipEnabled}>
      <Tippy
        content={menuContent}
        placement="top-start"
        interactive={true}
        arrow={false}
        animation={false}
        visible={isOpen}
        onClickOutside={handleClose}
        appendTo="parent"
      >
        <div onClick={() => isOpen ? handleClose() : handleOpen()}>
          {children}
        </div>
      </Tippy>
    </ToolHint>
  );
};

export default ThemeDropdown;
