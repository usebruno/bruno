import React, { useState, useRef, useEffect, useCallback } from 'react';
import get from 'lodash/get';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import { IconChevronDown, IconCheck } from '@tabler/icons';

// Zoom options for dropdown (10% to 200%)
const ZOOM_OPTIONS = [
  { label: '10%', value: 10 },
  { label: '20%', value: 20 },
  { label: '30%', value: 30 },
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
  { label: '60%', value: 60 },
  { label: '70%', value: 70 },
  { label: '80%', value: 80 },
  { label: '90%', value: 90 },
  { label: '100%', value: 100 },
  { label: '110%', value: 110 },
  { label: '120%', value: 120 },
  { label: '130%', value: 130 },
  { label: '140%', value: 140 },
  { label: '150%', value: 150 },
  { label: '160%', value: 160 },
  { label: '170%', value: 170 },
  { label: '180%', value: 180 },
  { label: '190%', value: 190 },
  { label: '200%', value: 200 }
];

const DEFAULT_ZOOM = 100;

// Convert percentage to zoom level (Electron uses logarithmic scale)
// Formula: percentage = 100 * 1.2^level
const percentageToZoomLevel = (percentage) => {
  return Math.log(percentage / 100) / Math.log(1.2);
};

const Zoom = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const isInitialMount = useRef(true);
  const { ipcRenderer } = window;

  // Get saved zoom percentage from Redux preferences
  const savedZoom = get(preferences, 'display.zoomPercentage', DEFAULT_ZOOM);
  const [zoomPercentage, setZoomPercentage] = useState(savedZoom);

  const handleZoomChange = (event) => {
    const newZoom = parseInt(event.target.value, 10);
    setZoomPercentage(newZoom);
  };

  const handleResetToDefault = () => {
    setZoomPercentage(DEFAULT_ZOOM);
  };

  // Save zoom to preferences and apply to window
  const handleSave = useCallback((zoom) => {
    // Apply zoom level to Electron window immediately
    if (ipcRenderer) {
      const zoomLevel = percentageToZoomLevel(zoom);
      ipcRenderer.invoke('renderer:set-zoom-level', zoomLevel);
    }

    // Save to preferences via Redux (same pattern as layout)
    const updatedPreferences = {
      ...preferences,
      display: {
        ...get(preferences, 'display', {}),
        zoomPercentage: zoom
      }
    };
    dispatch(savePreferences(updatedPreferences));
  }, [dispatch, preferences, ipcRenderer]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    handleSave(zoomPercentage);
  }, [zoomPercentage, handleSave]);

  const isDefault = zoomPercentage === DEFAULT_ZOOM;

  return (
    <StyledWrapper>
      <div className="flex flex-row gap-4 items-end">
        <div className="zoom-field">
          <label className="block">Interface Zoom</label>
          <select
            className="block textbox mt-2"
            value={zoomPercentage}
            onChange={handleZoomChange}
          >
            {ZOOM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {!isDefault && (
          <button
            type="button"
            className="reset-btn"
            onClick={handleResetToDefault}
          >
            Reset
          </button>
        )}
      </div>
    </StyledWrapper>
  );
};

export default Zoom;
