import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { refreshScreenWidthAndHeight } from 'providers/ReduxStore/slices/app';
import ConfirmAppClose from './ConfirmAppClose';
import useIpcEvents from './useIpcEvents';
import useTelemetry from './useTelemetry';
import StyledWrapper from './StyledWrapper';

export const AppContext = React.createContext();

export const AppProvider = (props) => {
  useTelemetry();
  useIpcEvents();

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(refreshScreenWidthAndHeight());
  }, []);

  useEffect(() => {
    const handleResize = () => {
      dispatch(refreshScreenWidthAndHeight());
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AppContext.Provider {...props} value="appProvider">
      <StyledWrapper>
        <ConfirmAppClose />
        {props.children}
      </StyledWrapper>
    </AppContext.Provider>
  );
};

export default AppProvider;
