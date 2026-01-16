import React, { useState, useRef, useCallback, useEffect } from 'react';
import Tippy from '@tippyjs/react';
import { IconCheck, IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import { useTheme } from 'providers/Theme';
import { getLightThemes, getDarkThemes } from 'themes/index';
import StyledWrapper from './StyledWrapper';

// Constants
const MODES = ['light', 'dark', 'system'];
const MODE_BUTTONS = [
  { mode: 'light', icon: IconSun, title: 'Light' },
  { mode: 'dark', icon: IconMoon, title: 'Dark' },
  { mode: 'system', icon: IconDeviceDesktop, title: 'System' }
];

const ThemeDropdown = ({ children }) => {
  // Dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipEnabled, setTooltipEnabled] = useState(true);

  // Keyboard navigation state
  const [focusedSection, setFocusedSection] = useState('mode');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  // Refs for focus management
  const menuRef = useRef(null);
  const modeButtonRefs = useRef([]);
  const lightItemRefs = useRef([]);
  const darkItemRefs = useRef([]);

  // Theme context
  const {
    storedTheme,
    setStoredTheme,
    displayedTheme,
    themeVariantLight,
    themeVariantDark,
    setThemeVariantLight,
    setThemeVariantDark
  } = useTheme();

  // Theme data
  const lightThemes = getLightThemes();
  const darkThemes = getDarkThemes();
  const isSystemMode = storedTheme === 'system';

  // Helper to get class names for focusable items
  const getFocusedClass = (section, index) => {
    return isKeyboardNav && focusedSection === section && focusedIndex === index ? 'focused' : '';
  };

  // Handlers
  const handleModeSelect = (mode) => setStoredTheme(mode);

  const handleThemeSelect = (themeId, isLight) => {
    if (isLight) {
      setThemeVariantLight(themeId);
    } else {
      setThemeVariantDark(themeId);
    }
  };

  const handleOpen = () => {
    setTooltipEnabled(false);
    setIsOpen(true);
    setFocusedSection('mode');
    setFocusedIndex(0);
    setIsKeyboardNav(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setTooltipEnabled(true), 100);
  };

  const handleMouseEnter = (section, index) => {
    setIsKeyboardNav(false);
    setFocusedSection(section);
    setFocusedIndex(index);
  };

  // Get available sections based on current mode
  const getAvailableSections = useCallback(() => {
    if (isSystemMode) return ['mode', 'light', 'dark'];
    return storedTheme === 'light' ? ['mode', 'light'] : ['mode', 'dark'];
  }, [isSystemMode, storedTheme]);

  // Get max index for a section
  const getMaxIndex = useCallback((section) => {
    switch (section) {
      case 'mode': return 2;
      case 'light': return lightThemes.length - 1;
      case 'dark': return darkThemes.length - 1;
      default: return 0;
    }
  }, [lightThemes.length, darkThemes.length]);

  // Get mode index for returning to mode section
  const getModeIndex = useCallback(() => {
    return MODES.indexOf(storedTheme);
  }, [storedTheme]);

  // Focus element based on current section and index
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const refs = {
        mode: modeButtonRefs,
        light: lightItemRefs,
        dark: darkItemRefs
      };
      refs[focusedSection]?.current[focusedIndex]?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, focusedSection, focusedIndex]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    const sections = getAvailableSections();
    const maxIndex = getMaxIndex(focusedSection);

    const navigationHandlers = {
      'Escape': () => {
        e.preventDefault();
        handleClose();
      },

      'ArrowDown': () => {
        e.preventDefault();
        setIsKeyboardNav(true);
        if (focusedSection === 'mode') {
          setFocusedSection(sections[1]);
          setFocusedIndex(0);
        } else if (focusedIndex < maxIndex) {
          setFocusedIndex(focusedIndex + 1);
        }
      },

      'ArrowUp': () => {
        e.preventDefault();
        setIsKeyboardNav(true);
        if (focusedSection !== 'mode') {
          if (focusedIndex > 0) {
            setFocusedIndex(focusedIndex - 1);
          } else {
            setFocusedSection('mode');
            setFocusedIndex(getModeIndex());
          }
        }
      },

      'ArrowLeft': () => {
        e.preventDefault();
        setIsKeyboardNav(true);
        if (focusedSection === 'mode') {
          if (focusedIndex > 0) setFocusedIndex(focusedIndex - 1);
        } else if (isSystemMode && focusedSection === 'dark') {
          setFocusedSection('light');
          setFocusedIndex(Math.min(focusedIndex, lightThemes.length - 1));
        }
      },

      'ArrowRight': () => {
        e.preventDefault();
        setIsKeyboardNav(true);
        if (focusedSection === 'mode') {
          if (focusedIndex < 2) setFocusedIndex(focusedIndex + 1);
        } else if (isSystemMode && focusedSection === 'light') {
          setFocusedSection('dark');
          setFocusedIndex(Math.min(focusedIndex, darkThemes.length - 1));
        }
      },

      'Enter': () => {
        e.preventDefault();
        if (focusedSection === 'mode') {
          handleModeSelect(MODES[focusedIndex]);
        } else if (focusedSection === 'light') {
          handleThemeSelect(lightThemes[focusedIndex].id, true);
        } else if (focusedSection === 'dark') {
          handleThemeSelect(darkThemes[focusedIndex].id, false);
        }
      },

      ' ': () => navigationHandlers.Enter(),

      'Tab': () => handleClose()
    };

    navigationHandlers[e.key]?.();
  }, [
    isOpen, focusedSection, focusedIndex, getAvailableSections,
    getMaxIndex, getModeIndex, isSystemMode, lightThemes, darkThemes
  ]);

  // Set up keyboard listener
  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Render theme list
  const renderThemeList = (themes, isLight, currentVariant, label) => {
    const refs = isLight ? lightItemRefs : darkItemRefs;
    const section = isLight ? 'light' : 'dark';
    const isActiveSystemTheme = isSystemMode && ((isLight && displayedTheme === 'light') || (!isLight && displayedTheme === 'dark'));

    return (
      <div className="theme-list" role="listbox" aria-label={label}>
        <div className="theme-list-label">
          {label}
          {isActiveSystemTheme && <span className="active-badge">Active</span>}
        </div>
        {themes.map((theme, index) => {
          const isActive = currentVariant === theme.id;
          return (
            <div
              key={theme.id}
              ref={(el) => (refs.current[index] = el)}
              className={`theme-item ${isActive ? 'active' : ''} ${getFocusedClass(section, index)}`}
              role="option"
              aria-selected={isActive}
              tabIndex={-1}
              onClick={() => handleThemeSelect(theme.id, isLight)}
              onMouseEnter={() => handleMouseEnter(section, index)}
            >
              <span className="theme-item-label">{theme.name}</span>
              {isActive && <IconCheck size={14} strokeWidth={2} className="check-icon" />}
            </div>
          );
        })}
      </div>
    );
  };

  // Render mode buttons
  const renderModeButtons = () => (
    <div className="mode-buttons" role="radiogroup" aria-labelledby="mode-label">
      {MODE_BUTTONS.map((btn, index) => {
        const Icon = btn.icon;
        const isActive = storedTheme === btn.mode;
        return (
          <button
            key={btn.mode}
            ref={(el) => (modeButtonRefs.current[index] = el)}
            className={`mode-button ${isActive ? 'active' : ''} ${getFocusedClass('mode', index)}`}
            role="radio"
            aria-checked={isActive}
            tabIndex={-1}
            onClick={() => handleModeSelect(btn.mode)}
            onMouseEnter={() => handleMouseEnter('mode', index)}
            title={btn.title}
          >
            <Icon size={18} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );

  // Menu content
  const menuContent = (
    <StyledWrapper>
      <div
        ref={menuRef}
        className={`theme-menu ${isSystemMode ? 'two-columns' : ''}`}
        role="dialog"
        aria-label="Theme selector"
      >
        <div className="mode-section">
          <div className="mode-label" id="mode-label">Appearance</div>
          {renderModeButtons()}
        </div>

        <div className={`theme-lists ${isSystemMode ? 'two-columns' : ''}`}>
          {(storedTheme === 'light' || isSystemMode)
            && renderThemeList(lightThemes, true, themeVariantLight, 'Light theme')}
          {(storedTheme === 'dark' || isSystemMode)
            && renderThemeList(darkThemes, false, themeVariantDark, 'Dark theme')}
        </div>
      </div>
    </StyledWrapper>
  );

  return (
    <ToolHint text="Theme" toolhintId="ThemeDropdown" place="top" offset={10} hidden={!tooltipEnabled}>
      <Tippy
        content={menuContent}
        placement="top-start"
        interactive
        arrow={false}
        animation={false}
        visible={isOpen}
        onClickOutside={handleClose}
        appendTo="parent"
      >
        <div onClick={() => (isOpen ? handleClose() : handleOpen())}>
          {children}
        </div>
      </Tippy>
    </ToolHint>
  );
};

export default ThemeDropdown;
