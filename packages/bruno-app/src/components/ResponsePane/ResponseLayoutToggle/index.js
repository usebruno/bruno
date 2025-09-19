import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const IconDockToBottom = () => {
  return (
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
  );
};

const IconDockToRight = () => {
  return (
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
  );
};

const ResponseLayoutToggle = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const orientation = preferences?.layout?.responsePaneOrientation || 'horizontal';

  const toggleOrientation = () => {
    const newOrientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
    const updatedPreferences = {
      ...preferences,
      layout: {
        ...preferences.layout,
        responsePaneOrientation: newOrientation
      }
    };
    dispatch(savePreferences(updatedPreferences));
  };

  return (
    <StyledWrapper className="ml-2 flex items-center">
      <button 
        onClick={toggleOrientation} 
        title={orientation === 'horizontal' ? 'Switch to vertical layout' : 'Switch to horizontal layout'}
      >
        {orientation === 'horizontal' ? (
          <IconDockToBottom />
        ) : (
          <IconDockToRight />
        )}
      </button>
    </StyledWrapper>
  );
};

export default ResponseLayoutToggle;