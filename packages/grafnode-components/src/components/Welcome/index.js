import React from 'react';
import StyledWrapper from './StyledWrapper';

const Welcome = ({dispatch, actions}) => {
  const handleClick = () => {
    dispatch({
      type: actions.ADD_NEW_HTTP_REQUEST
    });
  };

  return (
    <StyledWrapper className="pb-4 px-4">
      <div>Welcome</div>

      <div>
        <button
          style={{backgroundColor: '#8e44ad'}}
          className="flex items-center h-full text-white active:bg-blue-600 font-bold text-xs px-4 py-2 ml-2 uppercase rounded shadow hover:shadow-md outline-none focus:outline-none ease-linear transition-all duration-150"
          onClick={handleClick}
        >
          Add Request
        </button>
      </div>
    </StyledWrapper>
  )
};

export default Welcome;
