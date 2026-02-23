import React, { useState, useRef, useEffect } from 'react';
import get from 'lodash/get';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import { IconChevronDown, IconCheck } from '@tabler/icons';

// Zoom options for dropdown (50% to 150%)
const ZOOM_OPTIONS = [
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
  { label: '150%', value: 150 }
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
  const dropdownRef = useRef(null);
  const { ipcRenderer } = window;

  // Get saved zoom percentage from Redux preferences (single source of truth)
  const savedZoom = get(preferences, 'display.zoomPercentage', DEFAULT_ZOOM);
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (zoom) => {
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
    setIsOpen(false);
  };

  const handleResetToDefault = () => {
    handleSelect(DEFAULT_ZOOM);
  };

  const selectedOption = ZOOM_OPTIONS.find((opt) => opt.value === savedZoom);
  const isDefault = savedZoom === DEFAULT_ZOOM;

  return (
    <StyledWrapper>
      <div className="flex flex-row gap-4 items-end">
        <div className="zoom-field" ref={dropdownRef}>
          <label className="block">Interface Zoom</label>
          <div className="custom-select mt-2" onClick={() => setIsOpen(!isOpen)}>
            <span className="selected-value">{selectedOption?.label}</span>
            <IconChevronDown size={14} className="chevron-icon" />
          </div>
          {isOpen && (
            <div className="dropdown-menu">
              {ZOOM_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`dropdown-option ${option.value === savedZoom ? 'selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="option-label">{option.label}</span>
                  {option.value === savedZoom && <IconCheck size={14} className="check-icon" />}
                </div>
              ))}
            </div>
          )}
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
