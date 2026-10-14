import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import DeleteEnvironmentsModal from 'components/Environments/Common/DeleteEnvironmentsModal';
import { deleteEnvironment } from 'providers/ReduxStore/slices/collections/actions';

// Bulk delete modal for collection environments
const DeleteEnvironments = ({ collection, ...props }) => {
  const dispatch = useDispatch();
  const collectionUid = collection.uid;

  const onDeleteEnvironment = useCallback(
    (env) => dispatch(deleteEnvironment(env.uid, collectionUid)),
    [dispatch, collectionUid]
  );

  return <DeleteEnvironmentsModal scope="collection" onDeleteEnvironment={onDeleteEnvironment} {...props} />;
};

export default DeleteEnvironments;
