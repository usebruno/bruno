import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setFocusedSidebarPath } from 'providers/ReduxStore/slices/app';

/**
 * Shared focus contract for sidebar rows.
 *
 * Rows show a keyboard-focus style while focused and publish the pathname that
 * row-level shortcuts should act on. Requests use an empty string because they
 * have no directory, collections and folders use their pathname.
 */
const useSidebarRowFocus = (focusedPath) => {
  const dispatch = useDispatch();
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);

  const handleFocus = () => {
    setIsKeyboardFocused(true);
    dispatch(setFocusedSidebarPath(focusedPath));
  };

  const handleBlur = () => {
    setIsKeyboardFocused(false);
    dispatch(setFocusedSidebarPath(null));
  };

  return { isKeyboardFocused, handleFocus, handleBlur };
};

export default useSidebarRowFocus;
