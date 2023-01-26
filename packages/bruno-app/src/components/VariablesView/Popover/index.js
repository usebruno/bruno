import React, {useRef} from 'react';
import StyledWrapper from './StyledWrapper';
import useOnClickOutside from 'hooks/useOnClickOutside';

const PopOver = ({
  children,
  iconRef,
  handleClose
}) => {
  const popOverRef = useRef(null);
  
  useOnClickOutside(popOverRef, (e) => {
    if(iconRef && iconRef.current) {
      if (e.target == iconRef.current || iconRef.current.contains(e.target)) {
        return;
      }
    }
    handleClose();
  });

  return (
    <StyledWrapper>
      <div className="popover" ref={popOverRef}>
        <div className="popover-content">{children}</div>
      </div>
    </StyledWrapper>
  );
};

export default PopOver;