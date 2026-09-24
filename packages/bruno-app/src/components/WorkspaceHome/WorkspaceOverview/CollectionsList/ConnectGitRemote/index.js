import React, { useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { isGitRepositoryUrl } from 'utils/git';
import { connectCollectionToGit } from 'providers/ReduxStore/slices/workspaces/actions';

const ConnectGitRemote = ({ collectionPath, collectionName, initialUrl = '', onClose }) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      remoteUrl: initialUrl
    },
    validationSchema: Yup.object({
      remoteUrl: Yup.string()
        .trim()
        .required('Git remote URL is required')
        .test('is-git-url', 'Enter a valid Git URL', (value) => isGitRepositoryUrl(value))
    }),
    onSubmit: (values) => {
      dispatch(
        connectCollectionToGit({
          workspaceUid: activeWorkspaceUid,
          collectionPath,
          remoteUrl: values.remoteUrl.trim()
        })
      )
        .then(() => {
          toast.success('Git remote connected');
          onClose();
        })
        .catch(() => {
          // toast already handled in the thunk
        });
    }
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const title = initialUrl ? 'Update Git Remote' : 'Connect to Git';
  const confirmText = initialUrl ? 'Update' : 'Connect';

  return (
    <Modal size="md" title={title} confirmText={confirmText} handleConfirm={() => formik.handleSubmit()} handleCancel={onClose}>
      <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
        {collectionName ? (
          <div className="text-sm text-muted mb-3 leading-relaxed break-words space-y-2">
            <p className="m-0">
              Linking{' '}
              <span className="font-medium text-inherit break-words" title={collectionName}>
                {collectionName}
              </span>{' '}
              to a remote Git repository.
            </p>
            <p className="m-0">
              The URL is saved in <span className="font-mono">workspace.yml</span> only. Your collection files on disk are not
              modified.
            </p>
          </div>
        ) : null}
        <div>
          <label htmlFor="remoteUrl" className="block font-medium">
            Git Remote URL
          </label>
          <input
            id="remoteUrl"
            type="text"
            name="remoteUrl"
            ref={inputRef}
            className="block textbox mt-2 w-full"
            placeholder="https://github.com/owner/repo"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onChange={formik.handleChange}
            value={formik.values.remoteUrl || ''}
          />
          {formik.touched.remoteUrl && formik.errors.remoteUrl ? (
            <div className="text-red-500">{formik.errors.remoteUrl}</div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
};

export default ConnectGitRemote;
