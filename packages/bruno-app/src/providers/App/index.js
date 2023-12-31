import { refreshScreenWidth } from 'providers/ReduxStore/slices/app';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import useIpcEvents from './useIpcEvents';
import useTelemetry from './useTelemetry';

export const AppContext = React.createContext();

export const AppProvider = (props) => {
  useTelemetry();
  useIpcEvents();

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(refreshScreenWidth());
  }, []);

  useEffect(() => {
    const handleResize = () => {
      dispatch(refreshScreenWidth());
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AppContext.Provider {...props} value="appProvider">
      <StyledWrapper>{props.children}</StyledWrapper>
    </AppContext.Provider>
  );
};

export default AppProvider;
