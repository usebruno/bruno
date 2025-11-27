import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';
import { buildCustomTheme } from 'themes/index';

const Theme = () => {
  const { storedTheme, setStoredTheme, setCustomTheme } = useTheme();
  const [showCustomOptions, setShowCustomOptions] = useState(storedTheme?.startsWith('custom:'));

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      theme: storedTheme?.startsWith('custom:') ? 'custom' : storedTheme
    },
    validationSchema: Yup.object({
      theme: Yup.string().required('theme is required')
    }),
    onSubmit: (values) => {
      if (values.theme !== 'custom') {
        setStoredTheme(values.theme);
        setShowCustomOptions(false);
      } else {
        setShowCustomOptions(true);
      }
    }
  });

  const handlePresetThemeSelect = (presetName) => {
    const themeKey = `custom:${presetName}`;
    setStoredTheme(themeKey);
    setShowCustomOptions(true);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const themeData = JSON.parse(text);

      if (!themeData.colors) {
        alert('Invalid theme file: missing colors property');
        return;
      }

      const customTheme = buildCustomTheme(themeData.colors);
      const themeName = themeData.name || 'Custom';

      setCustomTheme(customTheme, themeName);
      setStoredTheme(`custom:${themeName}`);
    } catch (error) {
      alert('Error loading theme file: ' + error.message);
    }
  };

  return (
    <StyledWrapper>
      <div className="bruno-form">
        <div className="flex flex-col">
          <div className="flex items-center mt-2">
            <input
              id="light-theme"
              className="cursor-pointer"
              type="radio"
              name="theme"
              onChange={(e) => {
                formik.handleChange(e);
                formik.handleSubmit();
              }}
              value="light"
              checked={formik.values.theme === 'light'}
            />
            <label htmlFor="light-theme" className="ml-1 cursor-pointer select-none">
              Light
            </label>

            <input
              id="dark-theme"
              className="ml-4 cursor-pointer"
              type="radio"
              name="theme"
              onChange={(e) => {
                formik.handleChange(e);
                formik.handleSubmit();
              }}
              value="dark"
              checked={formik.values.theme === 'dark'}
            />
            <label htmlFor="dark-theme" className="ml-1 cursor-pointer select-none">
              Dark
            </label>

            <input
              id="system-theme"
              className="ml-4 cursor-pointer"
              type="radio"
              name="theme"
              onChange={(e) => {
                formik.handleChange(e);
                formik.handleSubmit();
              }}
              value="system"
              checked={formik.values.theme === 'system'}
            />
            <label htmlFor="system-theme" className="ml-1 cursor-pointer select-none">
              System
            </label>

            <input
              id="custom-theme"
              className="ml-4 cursor-pointer"
              type="radio"
              name="theme"
              onChange={(e) => {
                formik.handleChange(e);
                formik.handleSubmit();
              }}
              value="custom"
              checked={formik.values.theme === 'custom'}
            />
            <label htmlFor="custom-theme" className="ml-1 cursor-pointer select-none">
              Custom
            </label>
          </div>

          {showCustomOptions && (
            <div className="mt-4 custom-theme-section">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Light Themes</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="preset-theme-btn"
                    onClick={() => handlePresetThemeSelect('github-light')}
                  >
                    GitHub Light
                  </button>
                  <button
                    type="button"
                    className="preset-theme-btn"
                    onClick={() => handlePresetThemeSelect('solarized-light')}
                  >
                    Solarized Light
                  </button>
                  <button
                    type="button"
                    className="preset-theme-btn"
                    onClick={() => handlePresetThemeSelect('one-light')}
                  >
                    One Light
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Dark Themes</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="preset-theme-btn"
                    onClick={() => handlePresetThemeSelect('github-dark')}
                  >
                    GitHub Dark
                  </button>
                  <button
                    type="button"
                    className="preset-theme-btn"
                    onClick={() => handlePresetThemeSelect('nord')}
                  >
                    Nord
                  </button>
                  <button
                    type="button"
                    className="preset-theme-btn"
                    onClick={() => handlePresetThemeSelect('dracula')}
                  >
                    Dracula
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Or Load Custom Theme File</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="file-input"
                />
                <p className="text-xs mt-1" style={{ opacity: 0.7 }}>
                  Upload a JSON file with theme color tokens
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Theme;
