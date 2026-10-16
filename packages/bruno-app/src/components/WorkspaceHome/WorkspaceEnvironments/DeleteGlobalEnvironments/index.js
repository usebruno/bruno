import React from 'react';
import { useDispatch } from 'react-redux';
import DeleteEnvironmentsModal from 'components/Environments/Common/DeleteEnvironmentsModal';
import { deleteGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';

const DeleteGlobalEnvironments = (props) => {
  const dispatch = useDispatch();

  const onDeleteEnvironment = (env) => dispatch(deleteGlobalEnvironment({ environmentUid: env.uid }));

  return <DeleteEnvironmentsModal environmentType="global" onDeleteEnvironment={onDeleteEnvironment} {...props} />;
};

export default DeleteGlobalEnvironments;
