import { useEffect } from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';

const DEFAULT_APP_FONT = 'default';

/**
 * Drives the --app-font-family CSS variable that the app's UI styles resolve through.
 * Removing it falls back to the value declared in globals.css.
 */
const useAppFont = () => {
  const appFont = useSelector((state) => get(state.app.preferences, 'font.appFont', DEFAULT_APP_FONT));

  useEffect(() => {
    const root = document.documentElement;
    const font = typeof appFont === 'string' ? appFont.trim() : '';

    if (!font || font === DEFAULT_APP_FONT) {
      root.style.removeProperty('--app-font-family');
      return;
    }

    root.style.setProperty('--app-font-family', font);
  }, [appFont]);
};

export default useAppFont;
