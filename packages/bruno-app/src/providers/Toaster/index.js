import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from 'providers/Theme';
import { isPlaywright } from 'utils/common';

export const ToastContext = React.createContext();

export const ToastProvider = (props) => {
  const { theme, displayedTheme } = useTheme();

  const toastOptions = {
    duration: isPlaywright() ? 500 : 2000,
    style: {
      // Break long word like file-path, URL etc. to prevent overflow
      overflowWrap: 'anywhere',
      borderRadius: theme.border.radius.lg,
      background: displayedTheme === 'light'
        ? theme.background.base
        : theme.background.crust,
      color: theme.text
    }
  };

  return (
    <ToastContext.Provider {...props} value="toastProvider">
      <Toaster toastOptions={toastOptions} />
      <div>{props.children}</div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
