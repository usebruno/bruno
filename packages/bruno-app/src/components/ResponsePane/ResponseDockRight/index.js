import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { savePreferences } from 'providers/ReduxStore/slices/app';

const ResponseDockRight = ({}) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const isResponsePaneDockedToBottom = useSelector(
    (state) => state.app.preferences.userInterface.responsePaneDockedToBottom
  );

  const dockToRight = () => {
    dispatch(
      savePreferences(
        {
          ...preferences,
          userInterface: {
            responsePaneDockedToBottom: false
          }
        },
        false
      )
    );
  };

  return (
    <StyledWrapper className={`ml-2 flex items-center ${isResponsePaneDockedToBottom ? '' : 'hidden'}`}>
      <button onClick={dockToRight} title="Dock to right">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          fill="none"
        >
          <path fill="none" stroke="none" d="M 0,24 V 0 h 24 v 24 z" />
          <path d="m 4,20 m 2,0 A 2,2 0 0 1 4,18 V 6 A 2,2 0 0 1 6,4 h 12 a 2,2 0 0 1 2,2 v 12 a 2,2 0 0 1 -2,2 z" />
          <path d="M 15,20 V 4" />
          <path
            fill="currentColor"
            stroke="currentColor"
            d="m 19.111502,18.486486 c -0.115516,0.259266 -0.354643,0.491338 -0.639512,0.620643 -0.221702,0.100633 -0.393081,0.114019 -1.474447,0.115163 l -1.223586,0.0013 V 12 4.7764125 h 1.22675 c 1.194609,0 1.234605,0.0039 1.526503,0.14937 0.187285,0.09333 0.363095,0.2407725 0.46858,0.3929775 l 0.168829,0.243606 0.0129,6.373606 c 0.0105,5.212942 -0.0015,6.405822 -0.06597,6.550511 z"
          />
        </svg>
      </button>
    </StyledWrapper>
  );
};
export default ResponseDockRight;
