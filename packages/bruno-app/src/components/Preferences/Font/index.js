import React, { useState } from 'react';
import get from 'lodash/get';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const Font = ({ close }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);

  const [codeFont, setCodeFont] = useState(get(preferences, 'font.codeFont', 'default'));
  const [sizeFont, setSizeFont] = useState(get(preferences, 'font.sizeFont', 12));

  const handleStyleInputChange = (event) => {
    setCodeFont(event.target.value);
  };

  const handleSizeInputChange = (event) => {
    setSizeFont(event.target.value);
  };

  const handleSave = () => {
    dispatch(
      savePreferences({
        ...preferences,
        font: {
          codeFont,
          sizeFont
        }
      })
    ).then(() => {
      close();
    });
  };

  return (
    <StyledWrapper>
      <label className="block font-medium mb-3">Code Editor Font</label>
      <div className="mb-3 flex items-center">
        <label className="settings-label" htmlFor="fontstyle">
          Font
        </label>
        <input
          type="text"
          className="block textbox"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onChange={handleStyleInputChange}
          defaultValue={codeFont}
        />
      </div>

      <div className="mb-3 flex items-center">
        <label className="settings-label" htmlFor="fontsize">
          Size
        </label>
        <input
          type="number"
          min="6"
          max="24"
          className="block textbox"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onChange={handleSizeInputChange}
          defaultValue={sizeFont}
        />
      </div>
      <div className="mt-10">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Font;
