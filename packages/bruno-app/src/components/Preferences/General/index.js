import React, { useState } from 'react';
import { usePreferences } from 'providers/Preferences';
import StyledWrapper from './StyledWrapper';

const General = () => {
  const { preferences, setPreferences } = usePreferences();

  const [sslVerification, setSslVerification] = useState(preferences.request.sslVerification);
  const [autoSave, setAutoSave] = useState(preferences.request.autoSave);

  const handleCheckboxChange = (preferenceName) => {
    const updatedPreferences = { ...preferences };
    if (preferenceName === 'sslVerification') {
      updatedPreferences.request.sslVerification = !sslVerification;
    }

    if (preferenceName === 'autoSave') {
      updatedPreferences.request.autoSave = !autoSave;
    }
    setPreferences(updatedPreferences)
      .then(() => {
        setSslVerification(updatedPreferences.request.sslVerification);
        setAutoSave(updatedPreferences.request.autoSave);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (
    <StyledWrapper>
      <div className="rows">
        <div className="mt-2">
          <input
            type="checkbox"
            checked={sslVerification}
            onChange={() => handleCheckboxChange('sslVerification')}
            className="mr-3 mousetrap"
          />
          SSL Certificate Verification
        </div>
        <div className="mt-2">
          <input
            type="checkbox"
            checked={autoSave}
            onChange={() => handleCheckboxChange('autoSave')}
            className="mr-3 mousetrap"
          />
          Auto Save
        </div>
      </div>
    </StyledWrapper>
  );
};

export default General;
