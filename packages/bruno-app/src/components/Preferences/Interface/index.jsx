import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { IconInfoCircle } from '@tabler/icons-react';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import get from 'lodash/get';
import React from 'react';
import { useTheme } from 'providers/Theme';
import ThemeSelects from 'components/Preferences/Interface/ThemeSelects';

const interfacePrefsSchema = Yup.object().shape({
  hideTabs: Yup.boolean().default(false),
  font: Yup.object({
    codeFont: Yup.string().default('default')
  }),
  editor: Yup.object({
    monaco: Yup.boolean().default(false)
  }),
  theme: Yup.string().oneOf(['light', 'dark', 'system']).required('Theme is required')
});

const BetaAlert = () => {
  return (
    <div className="mt-6 rounded-md bg-blue-50 dark:bg-blue-600/10 p-3 ring-1 ring-inset ring-blue-400/30">
      <div className="flex">
        <div className="flex">
          <IconInfoCircle className="h-5 w-5 text-blue-400 dark:text-blue-400" aria-hidden="true" />
        </div>
        <div className="ml-2 flex-1 md:flex md:justify-between">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Monaco is a beta feature aiming to replace our current code editor.
            <br />
            Feel free to experiment with it and report our team any issue you may encounter.
          </p>
        </div>
      </div>
    </div>
  );
};

const BetaBadge = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-yellow-50 dark:bg-yellow-400/10 px-2 py-1 text-xs font-medium
     text-yellow-800 dark:text-yellow-500 ring-1 ring-inset ring-yellow-600/20 dark:ring-yellow-400/20 ${className}`}
    >
      Beta
    </span>
  );
};

const Interface = ({ close }) => {
  const { storedTheme, setStoredTheme } = useTheme();
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);

  const handleSave = (values) => {
    setStoredTheme(values.theme);
    delete values.theme;

    dispatch(
      savePreferences({
        ...preferences,
        ...values
      })
    ).then(() => {
      close();
    });
  };

  const formik = useFormik({
    initialValues: {
      hideTabs: get(preferences, 'hideTabs', false),
      font: {
        codeFont: get(preferences, 'font.codeFont', 'default')
      },
      editor: {
        monaco: get(preferences, 'editor.monaco', false)
      },
      theme: storedTheme
    },
    validationSchema: interfacePrefsSchema,
    onSubmit: handleSave
  });

  return (
    <StyledWrapper>
      <ThemeSelects
        value={formik.values.theme}
        onChange={(newTheme) => {
          formik.setFieldValue('theme', newTheme);
        }}
      />

      <div className="flex items-center mb-4">
        <input
          id="hideTabsSetting"
          className="mousetrap mr-0"
          type="checkbox"
          name="hideTabs"
          checked={formik.values.hideTabs}
          onChange={() => {
            formik.setFieldValue('hideTabs', !formik.values.hideTabs);
          }}
        />
        <label className="flex items-center ml-2 select-none" htmlFor="hideTabsSetting">
          Hide tabs
        </label>
      </div>

      <label className="block font-medium">Code Editor Font</label>
      <input
        type="text"
        className="block textbox mt-2 w-full"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        name="font.codeFont"
        value={formik.values.font.codeFont}
        onChange={formik.handleChange}
      />

      <BetaAlert />
      <div className="flex flex-col mt-4">
        <div className="flex items-center">
          <input
            id="monacoEditorEnabled"
            type="checkbox"
            name="editor.manoco"
            checked={formik.values.editor.monaco}
            onChange={() => {
              formik.setFieldValue('editor.monaco', !formik.values.editor.monaco);
            }}
            className="mousetrap mr-0"
          />
          <label className="flex items-center ml-2 select-none" htmlFor="monacoEditorEnabled">
            Enable Monaco Editor
            <BetaBadge className="ml-2" />
          </label>
        </div>
      </div>

      <div className="mt-10">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={formik.handleSubmit}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Interface;
