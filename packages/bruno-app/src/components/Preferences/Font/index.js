import React, { useState } from 'react';
import get from 'lodash/get';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const Font = ({ close }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);

  const [codeFont, setCodeFont] = useState(get(preferences, 'font.codeFont', 'default'));
  const [fontSize, setFontSize] = useState(get(preferences, 'font.fontSize', 14));

  const handleInputChange = (event) => {
    setCodeFont(event.target.value);
  };

  const handleFontSizeChange = (event) => {
    setFontSize(event.target.value);
  };

  const handleSave = () => {
    dispatch(
      savePreferences({
        ...preferences,
        font: {
          codeFont,
          fontSize
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
        onChange={handleInputChange}
        defaultValue={codeFont}
      />

      <label className="block font-medium mt-3">Font Size</label>
      <input
        type="text"
        className="block textbox mt-2 w-full"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        onChange={handleFontSizeChange}
        defaultValue={fontSize}
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
