import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import DeleteEnvironmentsModal from 'components/Environments/Common/DeleteEnvironmentsModal';
import { deleteEnvironment } from 'providers/ReduxStore/slices/collections/actions';

const DeleteCollectionEnvironments = ({ collectionUid, ...props }) => {
  const dispatch = useDispatch();

  const onDeleteEnvironment = useCallback(
    (env) => dispatch(deleteEnvironment(env.uid, collectionUid)),
    [dispatch, collectionUid]
  );

  return <DeleteEnvironmentsModal environmentType="collection" onDeleteEnvironment={onDeleteEnvironment} {...props} />;
};

export default DeleteCollectionEnvironments;
