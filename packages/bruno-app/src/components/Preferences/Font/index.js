import React, { useState } from 'react';
import get from 'lodash/get';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const Font = ({ close }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);

  const [codeFont, setCodeFont] = useState(get(preferences, 'font.codeFont', 'default'));

  const handleSelectChange = (event) => {
    const newFontSize = event.target.value;
    setCodeFont(newFontSize);

    document.documentElement.style.setProperty('--font-size', newFontSize);
  };

  const handleSave = () => {
    dispatch(
      savePreferences({
        ...preferences,
        font: {
          codeFont
        }
      })
    ).then(() => {
      close();
    });
  };

  return (
    <StyledWrapper>
      <label className="block font-medium">Code Editor Font Size</label>
      <select
        className="block textbox select mt-2 w-full"
        onChange={handleSelectChange}
        value={codeFont}
        placeholder="16px"
      >
        <option value="12px">12px</option>
        <option value="14px">14px</option>
        <option value="16px">16px</option>
        <option value="18px">18px</option>
        <option value="20px">20px</option>
      </select>

      <div className="mt-10">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Font;
