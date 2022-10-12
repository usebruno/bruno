import React from 'react';
import Portal from "components/Portal/index";
import Modal from "components/Modal/index";
import { deleteWorkspace } from 'providers/ReduxStore/slices/workspaces/actions';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const DeleteWorkspace = ({onClose, workspace}) => {
  const dispatch = useDispatch();
  const onConfirm = () =>{
    dispatch(deleteWorkspace(workspace.uid))
    .then(() => {
      toast.success("Workspace deleted!");
      onClose();
    })
    .catch(() => toast.error("An error occured while deleting the workspace"));
  };

  return (
      <Portal>
        <StyledWrapper>
            <Modal
              size="sm"
              title={"Delete Workspace"}
              confirmText="Delete"
              handleConfirm={onConfirm}
              handleCancel={onClose}
            >
              Are you sure you want to delete <span className="font-semibold">{workspace.name}</span> ?
            </Modal>
        </StyledWrapper>
      </Portal>
    
  );
}

export default DeleteWorkspace;

