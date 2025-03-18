import React from 'react';
import Portal from 'components/Portal/index';
import toast from 'react-hot-toast';
import Modal from 'components/Modal/index';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { deleteGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';

const DeleteEnvironment = ({ onClose, environment }) => {
  const dispatch = useDispatch();
  const onConfirm = () => {
    dispatch(deleteGlobalEnvironment({ environmentUid: environment.uid }))
      .then(() => {
        toast.success('Global Environment deleted successfully');
        onClose();
      })
      .catch(() => toast.error('An error occurred while deleting the environment'));
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="sm"
          title={'Delete Global Environment'}
          confirmText="Delete"
          handleConfirm={onConfirm}
          handleCancel={onClose}
        >
          Are you sure you want to delete <span className="font-semibold">{environment.name}</span> ?
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default DeleteEnvironment;
