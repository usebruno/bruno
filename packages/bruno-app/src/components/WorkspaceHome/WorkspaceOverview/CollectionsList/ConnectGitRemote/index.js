import React, { useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { isGitRepositoryUrl } from 'utils/git';
import { connectCollectionToGit } from 'providers/ReduxStore/slices/workspaces/actions';
import { useTranslation } from 'react-i18next';

const ConnectGitRemote = ({ collectionPath, collectionName, initialUrl = '', onClose }) => {
  const { t } = useTranslation();
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
        .required(t('WORKSPACE.OVERVIEW.GIT_URL_REQUIRED'))
        .test('is-git-url', t('WORKSPACE.OVERVIEW.ENTER_VALID_GIT_URL'), (value) => isGitRepositoryUrl(value))
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
          toast.success(t('WORKSPACE.OVERVIEW.GIT_REMOTE_CONNECTED'));
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

  const title = initialUrl ? t('WORKSPACE.OVERVIEW.UPDATE_GIT_REMOTE') : t('WORKSPACE.OVERVIEW.CONNECT_TO_GIT');
  const confirmText = initialUrl ? t('WORKSPACE.OVERVIEW.UPDATE') : t('WORKSPACE.OVERVIEW.CONNECT');

  return (
    <Modal size="md" title={title} confirmText={confirmText} handleConfirm={() => formik.handleSubmit()} handleCancel={onClose}>
      <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
        {collectionName ? (
          <div className="text-sm text-muted mb-3 leading-relaxed break-words space-y-2">
            <p className="m-0">
              {t('WORKSPACE.OVERVIEW.LINKING')}{' '}
              <span className="font-medium text-inherit break-words" title={collectionName}>
                {collectionName}
              </span>{' '}
              {t('WORKSPACE.OVERVIEW.TO_REMOTE_REPO')}.
            </p>
            <p className="m-0">
              {t('WORKSPACE.OVERVIEW.URL_SAVED_WORKSPACE_YML')}
            </p>
          </div>
        ) : null}
        <div>
          <label htmlFor="remoteUrl" className="block font-medium">
            {t('WORKSPACE.OVERVIEW.GIT_REMOTE_URL')}
          </label>
          <input
            id="remoteUrl"
            type="text"
            name="remoteUrl"
            ref={inputRef}
            className="block textbox mt-2 w-full"
            placeholder={t('WORKSPACE.OVERVIEW.GIT_URL_PLACEHOLDER')}
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
