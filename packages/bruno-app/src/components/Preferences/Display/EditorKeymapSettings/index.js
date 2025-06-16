import React, { useState } from 'react';
import get from 'lodash/get';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

// https://codemirror.net/5/keymap/
const codemirrorKeymaps = [
  { value: 'sublime', label: 'Sublime' },
  { value: 'vim', label: 'Vim' },
  { value: 'emacs', label: 'Emacs' },
];

const EditorKeymapSettings = ({ close }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const editorPreferences = preferences.editor || {};
  const keymap = editorPreferences.keymap || 'sublime';

  const handleKeymapChange = (e) => {
    dispatch(
      savePreferences({
        ...preferences,
        editor: { ...editorPreferences, keymap: e.target.value }
      })
    ).catch(console.error);
  };

  return (
    <StyledWrapper>
      <div className="bruno-form">
        <label className="block">Keymap</label>
        <div className="flex items-center mt-2">
          {codemirrorKeymaps.map(({ value, label }) => (
            <>
              <input
                id={label}
                className="cursor-pointer ml-4 first:ml-0"
                type="radio"
                name="keymap"
                onChange={handleKeymapChange}
                value={value}
                checked={keymap === value}
              />
              <label htmlFor={label} className="ml-1 cursor-pointer select-none">
                {label}
              </label>
            </>
          ))}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default EditorKeymapSettings;
