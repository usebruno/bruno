import React from 'react';
import Portal from "components/Portal/index";
import Modal from "components/Modal/index";
// import { deleteWorkspace } from 'providers/ReduxStore/slices/workspaces';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const DeleteEnvironment = ({onClose, environment}) => {
  const dispatch = useDispatch();
  const onConfirm = () =>{
    // dispatch(deleteWorkspace({workspaceUid: workspace.uid}))
    onClose();
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="sm"
          title={"Delete Environment"}
          confirmText="Delete"
          handleConfirm={onConfirm}
          handleCancel={onClose}
        >
          Are you sure you want to delete <span className="font-semibold">{environment.name}</span> ?
        </Modal>
      </StyledWrapper>
    </Portal>
    
  );
}

export default DeleteEnvironment;

