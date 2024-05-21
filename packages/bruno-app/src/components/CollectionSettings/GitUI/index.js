import React, { useState } from 'react';
import { useFormik } from 'formik';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { updateBrunoConfig } from 'providers/ReduxStore/slices/collections/actions';
import cloneDeep from 'lodash/cloneDeep';
import { IconEye, IconEyeOff } from '@tabler/icons';
import get from 'lodash/get';

const GitUI = ({ collection }) => {
  const dispatch = useDispatch();

  const git = get(collection, 'brunoConfig.git', []);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      enabled: git.enabled || false,
      repoUrl: git.repoUrl || '',
      auth: {
        enabled: git.auth ? git.auth.enabled || false : false,
        type: git.auth ? git.auth.type || 'ssh' : 'ssh',
        sshKeyPath: git.auth ? git.auth.sshKeyPath || '' : '',
        username: git.auth ? git.auth.username || '' : '',
        password: git.auth ? git.auth.password || '' : ''
      }
    },
    onSubmit: (newPresets) => {
      const brunoConfig = cloneDeep(collection.brunoConfig);
      brunoConfig.presets = newPresets;
      dispatch(updateBrunoConfig(brunoConfig, collection.uid));
      toast.success('Collection git settings updated');
    }
  });

  const [passwordVisible, setPasswordVisible] = useState(false);

  const getFile = (e) => {
    formik.values[e.name] = e.files[0].path;
  };

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">This is the Git UI</div>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        {formik.values.enabled ? <p>Git is enabled, but nothing is here yet :(</p> : null}
      </form>
    </StyledWrapper>
  );
};

export default GitUI;
