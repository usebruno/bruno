import React, { useEffect } from 'react';
import useIdb from './useIdb';
import useLocalCollectionTreeSync from './useLocalCollectionTreeSync';
import { useDispatch } from 'react-redux';
import { refreshScreenWidth } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

export const AppContext = React.createContext();

export const AppProvider = (props) => {
  useIdb();
  useLocalCollectionTreeSync();

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
      <StyledWrapper>
        {props.children}
      </StyledWrapper>
    </AppContext.Provider>
  );
};

export default AppProvider;
