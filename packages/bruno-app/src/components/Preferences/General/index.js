import React, { useState } from 'react';
import { get } from 'lodash';
import { usePreferences } from 'providers/Preferences';
import StyledWrapper from './StyledWrapper';

const General = () => {
  const { preferences, setPreferences } = usePreferences();

  const [sslVerification, setSslVerification] = useState(preferences.request.sslVerification);
  const [autoHideMenu, setAutoHideMenu] = useState(preferences.display.autoHideMenu);

  const handleCheckboxChange = (e) => {
    const updatedPreferences = {
      ...preferences,
      request: {
        ...preferences.request,
        sslVerification: e.target.name === 'sslVerification' ? !sslVerification : sslVerification
      },
      display: {
        ...preferences.display,
        autoHideMenu: e.target.name === 'autoHideMenu' ? !autoHideMenu : autoHideMenu
      }
    };

    setPreferences(updatedPreferences)
      .then(() => {
        setSslVerification(get(updatedPreferences, 'request.sslVerification'));
        setAutoHideMenu(get(updatedPreferences, 'display.autoHideMenu'));
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (
    <StyledWrapper>
      <div className="flex flex-col">
        <div className="items-center my-2">
          <h1 className="font-semibold">Request settings</h1>
          <input
            type="checkbox"
            name="sslVerification"
            checked={sslVerification}
            onChange={handleCheckboxChange}
            className="mr-3 mousetrap"
          />
          SSL Certificate Verification
        </div>

        <div className="items-center my-2">
          <h1 className="font-semibold">Display settings</h1>
          <input
            type="checkbox"
            name="autoHideMenu"
            checked={autoHideMenu}
            onChange={handleCheckboxChange}
            className="mr-3 mousetrap"
          />
          Auto-hide menu (it's only shown when alt is pressed)
        </div>
      </div>
    </StyledWrapper>
  );
};

export default General;
