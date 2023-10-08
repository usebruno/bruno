import React, { useState } from 'react';
import { usePreferences } from 'providers/Preferences';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';

const General = () => {
  const { preferences, setPreferences } = usePreferences();

  const [tlsVerification, setTlsVerification] = useState(preferences.request.tlsVerification);

  const handleCheckboxChange = () => {
    const updatedPreferences = {
      ...preferences,
      request: {
        ...preferences.request,
        tlsVerification: !tlsVerification
      }
    };

    setPreferences(updatedPreferences)
      .then(() => {
        setTlsVerification(!tlsVerification);
        toast.success('Request settings saved successful.');
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (
    <StyledWrapper>
      <div className="flex items-center mt-2">
        <input type="checkbox" checked={tlsVerification} onChange={handleCheckboxChange} className="mr-3 mousetrap" />
        TLS Certificate Verification
      </div>
    </StyledWrapper>
  );
};

export default General;
