import React from 'react';
import Portal from 'components/Portal/index';
import toast from 'react-hot-toast';
import Modal from 'components/Modal/index';
import { deleteEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';

const DeleteEnvironment = ({ onClose, environment, collection }) => {
  const dispatch = useDispatch();
  const onConfirm = () => {
    dispatch(deleteEnvironment(environment.uid, collection.uid))
      .then(() => {
        toast.success('Environment deleted successfully');
        onClose();
      })
      .catch(() => toast.error('An error occurred while deleting the environment'));
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="sm"
          title={'Delete Environment'}
          confirmText="Delete"
          handleConfirm={onConfirm}
          handleCancel={onClose}
        >
          <div className='flex gap-1'>Are you sure you want to delete <span className="font-semibold max-w-[200px] truncate inline-block">{environment.name}</span> ?</div>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default DeleteEnvironment;
