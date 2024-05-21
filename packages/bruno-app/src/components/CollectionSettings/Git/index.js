import React, { useState } from 'react';
import { useFormik } from 'formik';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { IconEye, IconEyeOff } from '@tabler/icons';
import get from 'lodash/get';
import * as Yup from 'yup';

const GitSettings = ({ collection, onUpdate }) => {
  const gitSchema = Yup.object({
    enabled: Yup.boolean(),
    repoUrl: Yup.string().when('enabled', {
      is: true,
      then: (repoUrl) => repoUrl.required('Specify the repository URL.')
    }),
    auth: Yup.object()
      .when('enabled', {
        is: true,
        then: Yup.object({
          type: Yup.string().oneOf(['none', 'ssh', 'password']),
          sshKeyPath: Yup.string().when('type', {
            is: 'ssh',
            then: (sshKeyPath) => sshKeyPath.required('Specify the ssh key file.')
          }),
          username: Yup.string().when('type', {
            is: 'password',
            then: (username) => username.required('Specify the username.')
          }),
          password: Yup.string().when('type', {
            is: 'password',
            then: (password) => password.required('Specify the password.')
          })
        })
      })
      .optional()
  });

  const git = get(collection, 'brunoConfig.git', []);

  const formik = useFormik({
    initialValues: {
      enabled: git.enabled || false,
      repoUrl: git.repoUrl || '',
      auth: {
        type: git.auth ? git.auth.type || 'none' : 'none',
        sshKeyPath: git.auth ? git.auth.sshKeyPath || undefined : undefined,
        username: git.auth ? git.auth.username || undefined : undefined,
        password: git.auth ? git.auth.password || undefined : undefined
      }
    },
    onSubmit: (values) => {
      gitSchema
        .validate(values, { abortEarly: true })
        .then((validatedGit) => {
          onUpdate(validatedGit);
        })
        .catch((error) => {
          let errMsg = error.message || 'Preferences validation error';
          toast.error(errMsg);
        });
    }
  });

  const [passwordVisible, setPasswordVisible] = useState(false);

  const getFile = (e) => {
    const inners = e.name.split('.');
    let target = formik.values;
    for (let i = 0; i < inners.length - 1; i++) {
      target = target[inners[i]];
    }
    target[inners[inners.length - 1]] = e.files[0].path;
  };

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">This is the git settings.</div>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <h1 className="font-semibold">Main settings</h1>
        <br />
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="enabled">
            Git enabled
          </label>
          <input type="checkbox" name="enabled" checked={formik.values.enabled} onChange={formik.handleChange} />
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label" htmlFor="repoUrl">
            Repository URL
          </label>
          <div className="flex items-center w-full ml-4">
            <div className="flex items-center flex-grow input-container h-full">
              <input
                id="repo-url"
                type="text"
                name="repoUrl"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={formik.handleChange}
                value={formik.values.repoUrl || ''}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

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
                {passwordVisible ? <IconEyeOff size={18} strokeWidth={1.5} /> : <IconEye size={18} strokeWidth={1.5} />}
              </button>
            </div>
            {formik.touched.auth?.password && formik.errors.auth?.password ? (
              <div className="ml-3 text-red-500">{formik.errors.auth.password}</div>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <button type="submit" className="submit btn btn-sm btn-secondary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default GitSettings;
