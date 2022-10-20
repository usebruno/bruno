import React, { useEffect, useReducer } from 'react';
import { useRouter } from 'next/router';
import AuthApi from 'api/auth';
import reducer from './reducer';

const AuthContext = React.createContext();

const initialState = {
  isLoading: true,
  lastStateTransition: null,
  currentUser: null
};

export const AuthProvider = (props) => {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    AuthApi.whoami()
      .then((response) => {
        let data = response.data;
        dispatch({
          type: 'WHOAMI_SUCCESS',
          user: {
            id: data.id,
            name: data.name,
            username: data.username
          }
        });
      })
      .catch((error) => {
        dispatch({
          type: 'WHOAMI_ERROR',
          error: error
        });
      });
  }, []);

  useEffect(() => {
    if (state.lastStateTransition === 'LOGIN_SUCCESS') {
      router.push('/');
    }
    if (state.lastStateTransition === 'WHOAMI_ERROR') {
      // Todo: decide action
      // router.push('/login');
    }
  }, [state]);

  return <AuthContext.Provider value={[state, dispatch]} {...props} />;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);

  if (context === undefined) {
    throw new Error(`useAuth must be used within a AuthProvider`);
  }

  return context;
};

export default AuthProvider;
