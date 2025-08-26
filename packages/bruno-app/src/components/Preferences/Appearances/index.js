import React, { useState } from 'react';
import get from 'lodash/get';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const Appearances = ({ close }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);

  const [showSendButton, setShowSendButton] = useState(get(preferences, 'appearances.showSendButton', false));

  const handleShowSendButtonChange = (event) => {
    setShowSendButton(event.target.checked);
  }

  const handleSave = () => {
    dispatch(
      savePreferences({
        ...preferences,
        appearances: {
          showSendButton
        }
      })
    ).then(() => {
      close();
    });
  };

  return (
    <StyledWrapper>
      <div className="flex flex-row gap-2 w-full">
        <div className="flex items-center mt-2">
          <input
            id="showSendButton"
            type="checkbox"
            name="showSendButton"
            checked={showSendButton}
            onChange={handleShowSendButtonChange}
            className="mousetrap mr-0"
          />
          <label className="block ml-2 select-none" htmlFor="showSendButton">
            Show send button
          </label>
        </div>
      </div>

      <div className="mt-10">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Appearances;
