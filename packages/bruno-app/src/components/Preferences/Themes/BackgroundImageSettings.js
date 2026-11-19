import React from 'react';
import { BACKGROUND_IMAGE_MODES, MAX_BACKGROUND_BLUR, MAX_BACKGROUND_TRANSPARENCY } from '@usebruno/common';
import { useBackgroundImage } from 'providers/App/BackgroundImage';
import { SettingsGroup } from '../SettingsLayout';

const MODE_LABELS = {
  fill: 'Fill',
  fit: 'Fit',
  stretch: 'Stretch',
  center: 'Center',
  tile: 'Tile'
};

const BackgroundImageSettings = () => {
  const { fileName, imageAvailable, busy, display, changeImage, changeDisplay, saveDisplay } = useBackgroundImage();

  return (
    <SettingsGroup
      title="Background image"
      description="Choose a PNG or JPEG image up to 20 MB."
      className="background-image-settings"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => changeImage('choose')}>
          Choose image…
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !fileName} onClick={() => changeImage('clear')}>
          Clear
        </button>
        {fileName && <span className="truncate min-w-0" title={fileName}>{fileName}</span>}
      </div>
      {fileName && !imageAvailable && <p role="status">The background image could not be loaded. Choose it again or clear it.</p>}
      <fieldset className="background-image-display" disabled={busy || !imageAvailable}>
        <div className="flex flex-col items-start gap-1">
          <label htmlFor="background-image-mode">Display mode</label>
          <select
            id="background-image-mode"
            className="textbox"
            value={display.mode}
            onChange={(event) => {
              changeDisplay({ mode: event.target.value });
              saveDisplay();
            }}
          >
            {BACKGROUND_IMAGE_MODES.map((mode) => <option key={mode} value={mode}>{MODE_LABELS[mode]}</option>)}
          </select>
        </div>
        <div className="background-image-sliders">
          <div>
            <div className="flex justify-between gap-2">
              <label htmlFor="background-image-transparency">Transparency</label>
              <span>{display.transparency}%</span>
            </div>
            <input
              id="background-image-transparency"
              className="w-full"
              type="range"
              min="0"
              max={MAX_BACKGROUND_TRANSPARENCY}
              value={display.transparency}
              aria-valuetext={`${display.transparency}%`}
              onChange={(event) => changeDisplay({ transparency: event.target.valueAsNumber })}
              onPointerUp={saveDisplay}
              onKeyUp={saveDisplay}
              onBlur={saveDisplay}
            />
          </div>
          <div>
            <div className="flex justify-between gap-2">
              <label htmlFor="background-image-blur">Blur</label>
              <span>{display.blur}px</span>
            </div>
            <input
              id="background-image-blur"
              className="w-full"
              type="range"
              min="0"
              max={MAX_BACKGROUND_BLUR}
              value={display.blur}
              aria-valuetext={`${display.blur} pixels`}
              onChange={(event) => changeDisplay({ blur: event.target.valueAsNumber })}
              onPointerUp={saveDisplay}
              onKeyUp={saveDisplay}
              onBlur={saveDisplay}
            />
          </div>
        </div>
      </fieldset>
    </SettingsGroup>
  );
};

export default BackgroundImageSettings;
