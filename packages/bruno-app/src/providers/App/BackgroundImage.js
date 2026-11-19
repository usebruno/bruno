import React, { createContext, useContext } from 'react';
import StyledWrapper from './StyledWrapper';
import useBackgroundImageSettings from './useBackgroundImageSettings';

const BackgroundImageContext = createContext(null);
const DISPLAY_STYLES = {
  fill: { backgroundSize: 'cover' },
  fit: { backgroundSize: 'contain' },
  stretch: { backgroundSize: '100% 100%' },
  center: { backgroundSize: 'auto' },
  tile: { backgroundPosition: 'left top', backgroundRepeat: 'repeat' }
};

export function useBackgroundImage() {
  return useContext(BackgroundImageContext);
}

export default function BackgroundImage({ children }) {
  const { url, ...settings } = useBackgroundImageSettings();
  const { display } = settings;
  const active = Boolean(url && display.transparency);
  const overscan = ['fill', 'stretch', 'tile'].includes(display.mode) ? display.blur * 2 : 0;

  return (
    <BackgroundImageContext.Provider value={{ ...settings, imageAvailable: Boolean(url) }}>
      <StyledWrapper
        data-background-image-active={active ? 'true' : undefined}
        style={active ? { '--bruno-background-transparency': `${display.transparency}%` } : undefined}
      >
        {active && (
          <div className="bruno-background-layer" aria-hidden="true">
            <div
              className="bruno-background-image"
              data-testid="background-image-layer"
              style={{
                backgroundImage: `url("${url}")`,
                ...DISPLAY_STYLES[display.mode],
                filter: display.blur ? `blur(${display.blur}px)` : undefined,
                inset: -overscan
              }}
            />
          </div>
        )}
        {children}
      </StyledWrapper>
    </BackgroundImageContext.Provider>
  );
}
