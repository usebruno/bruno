import React, { useEffect } from 'react';
import useTelemetry from './useTelemetry';
import useIpcEvents from './useIpcEvents';
import useCollectionNextAction from './useCollectionNextAction';
import { useDispatch } from 'react-redux';
import { refreshScreenWidth } from '@providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

export const AppContext = React.createContext();

export const AppProvider = (props) => {
  useTelemetry();
  useIpcEvents();
  useCollectionNextAction();

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
