import React, { useEffect } from 'react';
import { get } from 'lodash';
import { useDispatch } from 'react-redux';
import { refreshScreenWidth } from 'providers/ReduxStore/slices/app';
import ConfirmAppClose from './ConfirmAppClose';
import useIpcEvents from './useIpcEvents';
import useTelemetry from './useTelemetry';
import StyledWrapper from './StyledWrapper';
import { version } from '../../../package.json';

export const AppContext = React.createContext();

export const AppProvider = (props) => {
  useTelemetry({ version });
  useIpcEvents();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(refreshScreenWidth());
  }, []);

  useEffect(() => {
    const platform = get(navigator, 'platform', '');
    if(platform && platform.toLowerCase().indexOf('mac') > -1) {
      document.body.classList.add('os-mac');
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      dispatch(refreshScreenWidth());
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AppContext.Provider {...props} value={{ version }}>
      <StyledWrapper>
        <ConfirmAppClose />
        {props.children}
      </StyledWrapper>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppProvider;
