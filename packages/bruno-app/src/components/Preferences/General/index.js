import React, { useState } from 'react';
import { usePreferences } from 'providers/Preferences';
import StyledWrapper from './StyledWrapper';

const General = () => {
  const { preferences, setPreferences } = usePreferences();

  const [sslVerification, setSslVerification] = useState(preferences.request.sslVerification);
  const [timeout, setTimeout] = useState(preferences.request.timeout);

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

  const handleTimeoutChange = (value) => {
    const timeout = value === '' ? 0 : value;
    const updatedPreferences = {
      ...preferences,
      request: {
        ...preferences.request,
        timeout
      }
    };

    setPreferences(updatedPreferences)
      .then(() => {
        setTimeout(timeout);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (
    <StyledWrapper>
      <div className="flex items-center mt-2">
        <label className="mr-2" style={{ minWidth: 200 }} htmlFor="ssl-cert-verification">
          SSL Certificate Verification
        </label>
        <input
          id="ssl-cert-verification"
          type="checkbox"
          checked={sslVerification}
          onChange={handleCheckboxChange}
          className="mousetrap h-4 w-4 mr-0"
        />
      </div>
      <div className="flex items-center mt-2">
        <label className="mr-2" style={{ minWidth: 200 }}>
          Request Timeout (in ms)
        </label>
        <input
          value={timeout === 0 ? '' : timeout}
          onChange={(e) => handleTimeoutChange(e.target.value)}
          type="text"
          className="block textbox w-1/6"
        />
      </div>
    </StyledWrapper>
  );
};

export default General;
