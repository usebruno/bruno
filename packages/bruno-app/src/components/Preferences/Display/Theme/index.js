import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';
import toast from 'react-hot-toast';
import { validateThemeShape } from 'utils/validateThemes/validateTheme';
// 👇 usamos os temas nativos para saber as chaves base
import themes from 'themes/index';

const Theme = ({ close }) => {
  const { storedTheme, setStoredTheme } = useTheme();

  // Built-in theme keys (e.g. light, dark) — do not depend on provider snapshot
  const builtinKeys = Object.keys(themes);

  const readCustomThemes = () =>
    JSON.parse(localStorage.getItem('bruno.customThemes') || '{}');

  const customKeys = Object.keys(readCustomThemes());

  // Local UI state (so we can refresh the list after import/delete)
  const [customThemes, setCustomThemes] = useState(customKeys);
  const [themeOptions, setThemeOptions] = useState([...builtinKeys, ...customKeys]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { theme: storedTheme },
    validationSchema: Yup.object({
      theme: Yup.string().required('theme is required')
    }),
    onSubmit: (values) => {
      setStoredTheme(values.theme);
      toast.success(`Theme changed to "${values.theme}"`);
      if (close) close(); // only when user actually changes active theme
    }
  });

  const refreshLists = () => {
    const currentCustom = Object.keys(readCustomThemes());
    setCustomThemes(currentCustom);
    setThemeOptions([...builtinKeys, ...currentCustom]);
  };

  /**
   * Import JSON theme, validate, prevent duplicates (case-insensitive),
   * update list without closing Preferences and allow re-selecting same file.
   */
  const handleImportTheme = (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        const themeNameRaw = json.name || file.name.replace(/\.json$/i, '');
        const themeName = String(themeNameRaw).trim();

        if (!themeName) {
          toast.error('Theme name is required in JSON ("name" field) or derive from filename.');
          input.value = ''; // allow selecting same file again
          return;
        }

        const { name, ...themeData } = json;

        // Validate structure
        const res = validateThemeShape(themeData);
        if (!res.valid) {
          toast.error(`Invalid theme: ${res.message}`);
          input.value = ''; // reset file input to allow re-import of same file
          return;
        }

        // Prevent duplicates (case-insensitive) across builtins & customs
        const existing = readCustomThemes();
        const allNamesLC = new Set([...builtinKeys, ...Object.keys(existing)].map((n) => n.toLowerCase()));

        if (allNamesLC.has(themeName.toLowerCase())) {
          toast.error(`Theme "${themeName}" already exists. Delete it first to re-import.`);
          input.value = ''; // reset to allow selecting the same file again
          return;
        }

        // Save
        const updated = { ...existing, [themeName]: themeData };
        localStorage.setItem('bruno.customThemes', JSON.stringify(updated));

        // Refresh UI (without closing the modal)
        refreshLists();

        toast.success(`Theme "${themeName}" imported successfully`);
      } catch (err) {
        console.error('Theme import error:', err);
        toast.error('Invalid JSON theme file');
      } finally {
        // Critical: allow importing the same file again (same filename) right after
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  /**
   * Delete custom theme and refresh the list immediately.
   * If the deleted theme is active, fallback to "light" first to avoid provider crash.
   */
  const handleDeleteTheme = (themeName) => {
    const existing = readCustomThemes();
    if (!existing[themeName]) return;

    // If current active = deleted, switch first to avoid a transient undefined theme
    if (storedTheme === themeName) {
      setStoredTheme('light');
      formik.setFieldValue('theme', 'light', false);
    }

    delete existing[themeName];
    localStorage.setItem('bruno.customThemes', JSON.stringify(existing));

    // Refresh list now
    refreshLists();

    toast.success(`Theme "${themeName}" deleted`);
  };

  return (
    <StyledWrapper>
      <div className="bruno-form">
        {/* === Theme selection === */}
        <div className="flex flex-col gap-3 mt-2">
          {themeOptions.map((opt) => (
            <div key={opt} className="flex items-center justify-between">
              <label className="cursor-pointer flex items-center">
                <input
                  type="radio"
                  name="theme"
                  value={opt}
                  checked={formik.values.theme === opt}
                  onChange={(e) => {
                    formik.handleChange(e);
                    formik.handleSubmit();
                  }}
                />
                <span className="ml-2 capitalize">{opt}</span>
              </label>

              {/* Delete visible only for custom themes */}
              {customThemes.includes(opt) && (
                <button
                  className="btn btn-xs btn-danger ml-4"
                  onClick={() => handleDeleteTheme(opt)}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>

        {/* === Import JSON Theme === */}
        <div className="mt-4">
          <label
            htmlFor="theme-import"
            className="btn btn-sm btn-secondary cursor-pointer"
          >
            Import JSON Theme
          </label>
          <input
            id="theme-import"
            type="file"
            accept="application/json"
            onChange={handleImportTheme}
            className="hidden"
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Theme;
