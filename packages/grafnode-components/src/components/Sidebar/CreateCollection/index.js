import React from 'react';
import Modal from '../../Modal';

const CreateCollection = ({handleConfirm, handleCancel, actions, dispatch}) => {
  return (
    <Modal
      size="sm"
      title='Create Collection'
      handleConfirm={handleConfirm}
      handleCancel={handleCancel}
    >
      <form className="grafnode-form">
        <label htmlFor="name" className="block font-semibold">Name</label>
        <input
          id="collection-name" type="text" name="collection-name"
          className="block textbox mt-2 w-full"
          required
        />
      </form>
    </Modal>
  );
};

export default CreateCollection;
