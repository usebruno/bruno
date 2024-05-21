import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { browseDirectory, gitCloneCollection } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { IconEye, IconEyeOff } from '@tabler/icons';

const CloneCollection = ({ onClose }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      collectionLocation: '',
      repoUrl: '',
      auth: {
        type: 'none',
        sshKeyPath: undefined,
        username: undefined,
        password: undefined
      }
    },
    validationSchema: Yup.object({
      collectionLocation: Yup.string().min(1, 'location is required').required('location is required'),
      repoUrl: Yup.string().required('Specify the repository URL.'),
      auth: Yup.object({
        type: Yup.string().oneOf(['none', 'ssh', 'password']),
        sshKeyPath: Yup.string().when('type', {
          is: 'ssh',
          then: (sshKeyPath) => sshKeyPath.required('Specify the location of ssh key.')
        }),
        username: Yup.string().when('type', {
          is: 'password',
          then: (username) => username.required('Specify the username.')
        }),
        password: Yup.string().when('type', {
          is: 'password',
          then: (password) => password.required('Specify the password.')
        })
      }).optional()
    }),
    onSubmit: (values) => {
      toast.loading('Cloning collection...');
      dispatch(
        gitCloneCollection(values.collectionLocation, values.repoUrl, values.auth)
          .then(() => {
            toast.success('Collection cloned');
            onClose();
          })
          .catch(() => toast.error('An error occurred while cloning the collection'))
      );
    }
  });

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        // When the user closes the diolog without selecting anything dirPath will be false
        if (typeof dirPath === 'string') {
          formik.setFieldValue('collectionLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('collectionLocation', '');
        console.error(error);
      });
  };

  const getFile = (e) => {
    const inners = e.name.split('.');
    let target = formik.values;
    for (let i = 0; i < inners.length - 1; i++) {
      target = target[inners[i]];
    }
    target[inners[inners.length - 1]] = e.files[0].path;
  };

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const onSubmit = () => formik.handleSubmit();
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <Modal size="sm" title="Git Clone Collection" confirmText="Create" handleConfirm={onSubmit} handleCancel={onClose}>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div>
          <label htmlFor="collection-location" className="block font-semibold">
            Location
          </label>
          <input
            id="collection-location"
            type="text"
            name="collectionLocation"
            readOnly={true}
            className="block textbox mt-2 w-full cursor-pointer"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={formik.values.collectionLocation || ''}
            onClick={browse}
          />
          {formik.touched.collectionLocation && formik.errors.collectionLocation ? (
            <div className="text-red-500">{formik.errors.collectionLocation}</div>
          ) : null}
          <div className="mt-1">
            <span className="text-link cursor-pointer hover:underline" onClick={browse}>
              Browse
            </span>
          </div>

          <label htmlFor="collection-repo-url" className="flex items-center font-semibold mt-3">
            Repository URL
          </label>
          <input
            id="collection-repo-url"
            type="text"
            name="repoUrl"
            ref={inputRef}
            className="block textbox mt-2 w-full"
            onChange={(e) => {
              formik.handleChange(e);
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={formik.values.repoUrl || ''}
          />
          {formik.touched.repoUrl && formik.errors.repoUrl ? (
            <div className="text-red-500">{formik.errors.repoUrl}</div>
          ) : null}

          <h1 className="font-semibold mt-8 mb-2">Auth settings</h1>

          <div className="mb-3 flex items-center">
            <label className="settings-label" htmlFor="auth.type">
              Type
            </label>
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="auth.type"
                  value="none"
                  checked={formik.values.auth.type === 'none'}
                  onChange={formik.handleChange}
                  className="mr-1"
                />
                none
              </label>
              <label className="flex items-center ml-4">
                <input
                  type="radio"
                  name="auth.type"
                  value="ssh"
                  checked={formik.values.auth.type === 'ssh'}
                  onChange={formik.handleChange}
                  className="mr-1"
                />
                SSH
              </label>
              <label className="flex items-center ml-4">
                <input
                  type="radio"
                  name="auth.type"
                  value="password"
                  checked={formik.values.auth.type === 'password'}
                  onChange={formik.handleChange}
                  className="mr-1"
                />
                password
              </label>
            </div>
          </div>

          <div className="mb-3 flex items-center">
            <label className="settings-label" htmlFor="sshKeyPath">
              SSH key
            </label>
            {formik.values.auth.sshKeyPath && <label className="pr-1">{formik.values.auth.sshKeyPath}</label>}
            <input
              id="sshKeyPath"
              type="file"
              name="auth.sshKeyPath"
              className="block non-passphrase-input"
              onChange={(e) => getFile(e.target)}
            />
            {formik.touched.auth?.sshKeyPath && formik.errors.auth?.sshKeyPath ? (
              <div className="ml-1 text-red-500">{formik.errors.auth.sshKeyPath}</div>
            ) : null}
          </div>

          <div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="auth.username">
                Username
              </label>
              <input
                id="auth.username"
                type="text"
                name="auth.username"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={formik.values.auth.username}
                onChange={formik.handleChange}
              />
              {formik.touched.auth?.username && formik.errors.auth?.username ? (
                <div className="ml-3 text-red-500">{formik.errors.auth.username}</div>
              ) : null}
            </div>
            <div className="mb-3 flex items-center">
              <label className="settings-label" htmlFor="auth.password">
                Password
              </label>
              <div className="textbox flex flex-row items-center w-[13.2rem] h-[1.70rem] relative">
                <input
                  id="auth.password"
                  type={passwordVisible ? 'text' : 'password'}
                  name="auth.password"
                  className="outline-none bg-transparent w-[10.5rem]"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  value={formik.values.auth.password}
                  onChange={formik.handleChange}
                />
                <button
                  type="button"
                  className="btn btn-sm absolute right-0"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? (
                    <IconEyeOff size={18} strokeWidth={1.5} />
                  ) : (
                    <IconEye size={18} strokeWidth={1.5} />
                  )}
                </button>
              </div>
              {formik.touched.auth?.password && formik.errors.auth?.password ? (
                <div className="ml-3 text-red-500">{formik.errors.auth.password}</div>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CloneCollection;
