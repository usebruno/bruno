import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { refreshScreenWidth } from 'providers/ReduxStore/slices/app';
import ConfirmAppClose from './ConfirmAppClose';
import useIpcEvents from './useIpcEvents';
import useTelemetry from './useTelemetry';
import StyledWrapper from './StyledWrapper';
import { checkAndDeleteStaleItems } from 'providers/ReduxStore/slices/collections/actions';

export const AppContext = React.createContext();

export const AppProvider = (props) => {
  useTelemetry();
  useIpcEvents();

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(refreshScreenWidth());

    // Handling stale redux state scenario:
    // When the app is not open, and the bru files are removed from the file system,
    // the persisted redux state will still have the items in the collections.
    // This will lead to stale request items in the app.

    // To handle this, we will check if the request item pathnames from the redux state exists in the filesystem
    // If not, we will remove the request item from the redux state.

    // This should be triggered only once, when the app is opened.
    // This could be placed in a middleware ?
    dispatch(checkAndDeleteStaleItems());
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
      <StyledWrapper>
        <ConfirmAppClose />
        {props.children}
      </StyledWrapper>
    </AppContext.Provider>
  );
};

export default AppProvider;
