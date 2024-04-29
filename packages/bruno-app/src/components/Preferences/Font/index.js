import React, { useState } from 'react';
import get from 'lodash/get';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const Font = ({ close }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);

  const [codeFont, setCodeFont] = useState(get(preferences, 'font.codeFont', 'default'));
  const [codeFontSize, setCodeFontSize] = useState(get(preferences, 'font.codeFontSize', '12'));

  const handleCodeFontChange = (event) => {
    setCodeFont(event.target.value);
  };

  const handleCodeFontSizeChange = (event) => {
    setCodeFontSize(event.target.value);
  };

  const handleSave = () => {
    dispatch(
      savePreferences({
        ...preferences,
        font: {
          codeFont,
          codeFontSize
        }
      })
    ).then(() => {
      close();
    });
  };

  return (
    <StyledWrapper>
      <label className="block font-medium">Code Editor Font</label>
      <input
        type="text"
        className="block textbox mt-2 w-full"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        onChange={handleCodeFontChange}
        defaultValue={codeFont}
      />
      <label classname="block font-medium">Code Editor Font Size</label>
      <input
        type="number"
        className="block textbox mt-2 w-full"
        autoComplete="off"
        autoCorrect="off"
        inputMode="numeric"
        onChange={handleCodeFontSizeChange}
        defaultValue={codeFontSize}
      />

      <div className="mt-10">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Font;
