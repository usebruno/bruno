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
      <input type="text" id="first_name" onChange={handleInputChange} placeholder="Local font" defaultValue={codeFont} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-1.5" />
    </StyledWrapper>
  );
};

export default Font;
