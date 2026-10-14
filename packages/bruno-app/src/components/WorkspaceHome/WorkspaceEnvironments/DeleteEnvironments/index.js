import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import DeleteEnvironmentsModal from 'components/Environments/Common/DeleteEnvironmentsModal';
import { deleteGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';

// Bulk delete modal for global (workspace) environments
const DeleteEnvironments = (props) => {
  const dispatch = useDispatch();

  const onDeleteEnvironment = useCallback(
    (env) => dispatch(deleteGlobalEnvironment({ environmentUid: env.uid })),
    [dispatch]
  );

  return <DeleteEnvironmentsModal scope="workspace" onDeleteEnvironment={onDeleteEnvironment} {...props} />;
};

export default DeleteEnvironments;
