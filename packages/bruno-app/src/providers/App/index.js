import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { refreshScreenWidth } from 'providers/ReduxStore/slices/app';
import ConfirmAppClose from './ConfirmAppClose';
import useIpcEvents from './useIpcEvents';
import useTelemetry from './useTelemetry';
import StyledWrapper from './StyledWrapper';
import { initMonaco } from 'utils/monaco/monacoUtils';
import { useMonaco } from '@monaco-editor/react';

export const AppContext = React.createContext();

export const AppProvider = (props) => {
  useTelemetry();
  useIpcEvents();

  const monaco = useMonaco();
  const dispatch = useDispatch();

  useEffect(() => {
    if (monaco) {
      initMonaco(monaco);
    }
  }, [monaco]);

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
      <StyledWrapper>
        <ConfirmAppClose />
        {props.children}
      </StyledWrapper>
    </AppContext.Provider>
  );
};

export default AppProvider;
