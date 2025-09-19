import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from 'providers/Theme';

export const ToastContext = React.createContext();

export const ToastProvider = (props) => {
  const { storedTheme } = useTheme();

  const toastOptions = {
    duration: 2000,
    style: {
      // Break long word like file-path, URL etc. to prevent overflow
      overflowWrap: 'anywhere'
    }
  };

  if (storedTheme === 'dark') {
    toastOptions.style = {
      ...toastOptions.style,
      borderRadius: '10px',
      background: '#3d3d3d',
      color: '#fff'
    };
  }

  return (
    <ToastContext.Provider {...props} value="toastProvider">
      <Toaster toastOptions={toastOptions} />
      <div>{props.children}</div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
