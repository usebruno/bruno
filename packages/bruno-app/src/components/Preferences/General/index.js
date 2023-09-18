import React, { useState } from 'react';
import { usePreferences } from 'providers/Preferences';
import StyledWrapper from './StyledWrapper';

const General = () => {
  const { preferences, setPreferences } = usePreferences();

  const [sslVerification, setSslVerification] = useState(preferences.request.sslVerification);

  const handleCheckboxChange = () => {
    const updatedPreferences = {
      ...preferences,
      request: {
        ...preferences.request,
        sslVerification: !sslVerification
      }
    };

    setPreferences(updatedPreferences)
      .then(() => {
        setSslVerification(!sslVerification);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (
    <StyledWrapper>
      <div className="flex items-center mt-2">
        <input type="checkbox" checked={sslVerification} onChange={handleCheckboxChange} className="mr-3 mousetrap" />
        SSL Certificate Verification
      </div>
    </StyledWrapper>
  );
};

export default General;
