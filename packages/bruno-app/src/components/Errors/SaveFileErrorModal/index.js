import React from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { useState } from 'react';
import StyledWrapper from './StyledWrapper';

const SaveFileErrorModal = ({ error }) => {
  const [showModal, setShowModal] = useState(true);
  return (
    <>
      {showModal ? (
        <Portal>
          <StyledWrapper>
            <Modal
              size="sm"
              title="Save File Error"
              hideFooter={true}
              hideCancel={true}
              handleCancel={() => {
                setShowModal(false);
              }}
              disableCloseOnOutsideClick={true}
              disableEscapeKey={true}
            >
              <pre className="w-full flex flex-wrap whitespace-pre-wrap">{error}</pre>
            </Modal>
          </StyledWrapper>
        </Portal>
      ) : null}
    </>
  );
};

export default SaveFileErrorModal;
