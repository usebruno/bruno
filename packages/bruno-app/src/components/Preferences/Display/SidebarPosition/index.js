import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';

const SidebarPosition = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const sidebarPosition = get(preferences, 'layout.sidebarPosition', 'left');

  const handleSidebarPositionChange = (event) => {
    dispatch(
      savePreferences({
        ...preferences,
        layout: {
          ...get(preferences, 'layout', {}),
          sidebarPosition: event.target.value
        }
      })
    );
  };

  return (
    <div>
      <div className="block">Sidebar Position</div>
      <div className="flex items-center mt-2">
        <input
          id="sidebar-position-left"
          className="cursor-pointer"
          type="radio"
          name="sidebar-position"
          value="left"
          checked={sidebarPosition === 'left'}
          onChange={handleSidebarPositionChange}
        />
        <label htmlFor="sidebar-position-left" className="ml-1 cursor-pointer select-none">
          Left
        </label>

        <input
          id="sidebar-position-right"
          className="ml-4 cursor-pointer"
          type="radio"
          name="sidebar-position"
          value="right"
          checked={sidebarPosition === 'right'}
          onChange={handleSidebarPositionChange}
        />
        <label htmlFor="sidebar-position-right" className="ml-1 cursor-pointer select-none">
          Right
        </label>
      </div>
    </div>
  );
};

export default SidebarPosition;
