import React, { useState } from 'react';
import { usePreferences } from 'providers/Preferences';
import StyledWrapper from './StyledWrapper';

const Font = () => {
  const { preferences, setPreferences } = usePreferences();

  const [codeFont, setCodeFont] = useState(preferences.codeFont);

  const handleInputChange = (event) => {
    const updatedPreferences = {
      ...preferences,
      codeFont: event.target.value
    };

    setPreferences(updatedPreferences)
      .then(() => {
        setCodeFont(event.target.value);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (   
    <StyledWrapper>
      <h2>Font in code area</h2>
      <div className='input-container'>
        <input type="text" onChange={handleInputChange} placeholder="Local font" defaultValue={codeFont} className="w-full px-3 py-1.5" />
      </div>
    </StyledWrapper>
  );
};

export default Font;
