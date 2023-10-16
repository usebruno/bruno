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
        <label className="mr-2 select-none" style={{ minWidth: 200 }} htmlFor="ssl-cert-verification">
          TLS Certificate Verification
        </label>
        <input
          id="ssl-cert-verification"
          type="checkbox"
          checked={sslVerification}
          onChange={() => setSslVerification(!sslVerification)}
          className="mousetrap mr-0"
        />
      </div>
      <div className="flex flex-col mt-6">
        <label className="block font-medium select-none">Request Timeout (in ms)</label>
        <input
          type="text"
          className="block textbox mt-2 w-1/4"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onChange={(e) => handleTimeoutChange(e.target.value)}
          defaultValue={timeout === 0 ? '' : timeout}
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
