import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const General = ({ close }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const [sslVerification, setSslVerification] = useState(preferences.request.sslVerification);
  const [timeout, setTimeout] = useState(preferences.request.timeout);

  const handleSave = () => {
    dispatch(
      savePreferences({
        ...preferences,
        request: {
          sslVerification,
          timeout
        }
      })
    ).then(() => {
      close();
    });
  };

  const handleTimeoutChange = (value) => {
    const validTimeout = isNaN(Number(value)) ? timeout : Number(value);
    setTimeout(validTimeout);
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
          onChange={() => setSslVerification(!sslVerification)}
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

      <div className="mt-10">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default General;
