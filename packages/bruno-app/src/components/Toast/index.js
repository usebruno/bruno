import React, { useEffect } from 'react';
import StyledWrapper from './StyledWrapper';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const ToastContent = ({ type, text, handleClose }) => (
  <div className={`alert alert-${type}`} role="alert">
    <div> {text} </div>
    <div onClick={handleClose} className="closeToast">
      <FontAwesomeIcon size="xs" icon={faTimes} />
    </div>
  </div>
);

const Toast = ({ text, type, duration, handleClose }) => {
  let lifetime = duration ? duration : 3000;

  useEffect(() => {
    if (text) {
      setTimeout(handleClose, lifetime);
    }
  }, [text]);

  return (
    <StyledWrapper className="bruno-toast">
      <div className="bruno-toast-card">
        <ToastContent type={type} text={text} handleClose={handleClose}></ToastContent>
      </div>
    </StyledWrapper>
  );
};

export default Toast;
