import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { savePreferences } from 'providers/ReduxStore/slices/app';

const ResponseDockBottom = ({}) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const isResponsePaneDockedToBottom = useSelector(
    (state) => state.app.preferences.userInterface.responsePaneDockedToBottom
  );

  const dockToBottom = () => {
    dispatch(
      savePreferences(
        {
          ...preferences,
          userInterface: {
            responsePaneDockedToBottom: true
          }
        },
        false
      )
    );
  };

  return (
    <StyledWrapper className={`ml-2 flex items-center ${isResponsePaneDockedToBottom ? 'hidden' : ''}`}>
      <button onClick={dockToBottom} title="Dock to bottom">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          fill="none"
        >
          <path stroke="none" fill="none" d="M0 0h24v24H0z" />
          <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
          <path d="M4 15l16 0" />
          <path
            fill="currentColor"
            d="M 5.5135136,19.111502 C 5.2542477,18.995986 5.0221761,18.756859 4.8928709,18.47199 4.7922381,18.250288 4.7788524,18.078909 4.7777079,16.997543 l -0.0013,-1.223586 H 12 19.223587 v 1.22675 c 0,1.194609 -0.0039,1.234605 -0.149369,1.526503 -0.09333,0.187285 -0.240773,0.363095 -0.392978,0.46858 l -0.243606,0.168829 -6.373606,0.0129 c -5.2129418,0.0105 -6.4058225,-0.0015 -6.5505114,-0.06597 z"
          />
        </svg>
      </button>
    </StyledWrapper>
  );
};
export default ResponseDockBottom;
