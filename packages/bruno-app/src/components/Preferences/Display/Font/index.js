import React, { useState, useEffect, useCallback, useRef } from 'react';
import get from 'lodash/get';
import debounce from 'lodash/debounce';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';

const Font = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const isInitialMount = useRef(true);

  const [appFont, setAppFont] = useState(get(preferences, 'font.appFont', 'default'));
  const [codeFont, setCodeFont] = useState(get(preferences, 'font.codeFont', 'default'));
  const [codeFontSize, setCodeFontSize] = useState(get(preferences, 'font.codeFontSize', '13'));

  const handleAppFontChange = (event) => {
    setAppFont(event.target.value);
  };

  const handleCodeFontChange = (event) => {
    setCodeFont(event.target.value);
  };

  const handleCodeFontSizeChange = (event) => {
    // Restrict to min/max value
    const clampedSize = Math.max(1, Math.min(event.target.value, 32));
    setCodeFontSize(clampedSize);
  };

  const handleSave = useCallback((uiFont, font, fontSize) => {
    dispatch(
      savePreferences({
        ...preferences,
        font: {
          appFont: uiFont,
          codeFont: font,
          codeFontSize: fontSize
        }
      })
    ).catch(() => {
      toast.error('Failed to save preferences');
    });
  }, [dispatch, preferences]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const debouncedSave = useCallback(
    debounce((uiFont, font, fontSize) => {
      handleSaveRef.current(uiFont, font, fontSize);
    }, 500),
    []
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    debouncedSave(appFont, codeFont, codeFontSize);
    return () => {
      debouncedSave.flush();
    };
  }, [appFont, codeFont, codeFontSize, debouncedSave]);

  return (
    <StyledWrapper>
      <div className="settings-row">
        <div className="settings-row-title">Code Editor</div>
        <div className="flex flex-row gap-2 w-full">
          <div className="w-4/5">
            <input
              type="text"
              className="block textbox w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={handleCodeFontChange}
              defaultValue={codeFont}
            />
          </div>
          <div className="w-1/5">
            <input
              type="number"
              className="block textbox w-full"
              autoComplete="off"
              autoCorrect="off"
              inputMode="numeric"
              title="Font size"
              onChange={handleCodeFontSizeChange}
              defaultValue={codeFontSize}
            />
          </div>
        </div>
      </div>
      <div className="settings-row">
        <div className="settings-row-title">Interface</div>
        <div className="w-4/5">
          <input
            type="text"
            className="block textbox w-full"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-testid="app-font-input"
            onChange={handleAppFontChange}
            defaultValue={appFont}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Font;
