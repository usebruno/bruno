import React, { useCallback } from 'react';
import get from 'lodash/get';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { BETA_FEATURES } from 'utils/beta-features';
import Font from './Font/index';
import Zoom from './Zoom/index';

const Display = ({ close }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const tabsAcrossCollections = get(preferences, `beta.${BETA_FEATURES.TABS_ACROSS_COLLECTIONS}`, false);

  const handleToggleTabsAcrossCollections = useCallback((e) => {
    dispatch(savePreferences({
      ...preferences,
      beta: {
        ...get(preferences, 'beta', {}),
        [BETA_FEATURES.TABS_ACROSS_COLLECTIONS]: e.target.checked
      }
    }));
  }, [dispatch, preferences]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="section-header">Display</div>
      <div className="flex flex-col mb-2 gap-10 w-full">
        <div className="w-fit flex flex-col gap-2">
          <Font close={close} />
        </div>
        <div className="w-full flex flex-col gap-2">
          <Zoom />
        </div>
        <div className="w-full flex flex-col gap-2">
          <label className="block">Tabs</label>
          <div className="flex items-center mt-1">
            <input
              id="tabsAcrossCollections"
              type="checkbox"
              checked={tabsAcrossCollections}
              onChange={handleToggleTabsAcrossCollections}
              className="mousetrap mr-0"
            />
            <label className="block ml-2 select-none" htmlFor="tabsAcrossCollections">
              Show open tabs from all collections together
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Display;
