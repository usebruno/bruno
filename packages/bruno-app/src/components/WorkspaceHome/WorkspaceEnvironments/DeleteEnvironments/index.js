import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import DeleteEnvironmentsModal from 'components/Environments/Common/DeleteEnvironmentsModal';
import { deleteGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';

const DeleteEnvironments = (props) => {
  const dispatch = useDispatch();

  const onDeleteEnvironment = useCallback(
    (env) => dispatch(deleteGlobalEnvironment({ environmentUid: env.uid })),
    [dispatch]
  );

  return <DeleteEnvironmentsModal environmentType="global" onDeleteEnvironment={onDeleteEnvironment} {...props} />;
};

export default DeleteEnvironments;
