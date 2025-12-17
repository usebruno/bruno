import React, { useRef, useEffect, useState } from 'react';
import { useFormik } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { createWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { multiLineMsg } from 'utils/common/index';
import { formatIpcError } from 'utils/common/error';
import Help from 'components/Help';

const CreateWorkspace = ({ onClose }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      workspaceName: '',
      workspaceLocation: ''
    },
    validationSchema: Yup.object({
      workspaceName: Yup.string()
        .min(1, 'must be at least 1 character')
        .max(255, 'must be 255 characters or less')
        .required('workspace name is required')
        .test('unique-name', 'A workspace with this name already exists', function (value) {
          if (!value) return true;

          return !workspaces.some((w) =>
            w.name.toLowerCase() === value.toLowerCase());
        }),
      workspaceLocation: Yup.string().min(1, 'location is required').required('location is required')
    }),
    onSubmit: async (values) => {
      if (isSubmitting) return;

      try {
        setIsSubmitting(true);

        await dispatch(createWorkspaceAction(values.workspaceName, values.workspaceName, values.workspaceLocation));
        toast.success('Workspace created!');
        onClose();
      } catch (error) {
        toast.error(multiLineMsg('An error occurred while creating the workspace', formatIpcError(error)));
      } finally {
        setIsSubmitting(false);
      }
    }
  });

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          formik.setFieldValue('workspaceLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('workspaceLocation', '');
        console.error(error);
      });
  };

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return (
    <Modal
      size="md"
      title="Create Workspace"
      description="Give your new workspace a name and choose its type to get started."
      confirmText={isSubmitting ? 'Creating...' : 'Create Workspace'}
      handleConfirm={formik.handleSubmit}
      handleCancel={onClose}
      style="new"
      confirmDisabled={isSubmitting}
    >
      <div>
        <form className="bruno-form" onSubmit={formik.handleSubmit}>
          <div className="mb-4">
            <label htmlFor="workspaceName" className="block font-semibold mb-2">
              Name
            </label>
            <input
              id="workspace-name"
              type="text"
              name="workspaceName"
              ref={inputRef}
              className="block textbox w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.workspaceName || ''}
            />
            {formik.touched.workspaceName && formik.errors.workspaceName ? (
              <div className="text-red-500 text-sm mt-1">{formik.errors.workspaceName}</div>
            ) : null}
          </div>

          <div className="mb-4">
            <label htmlFor="workspaceLocation" className="font-semibold mb-2 flex items-center">
              Location
              <Help>
                <p>
                  Bruno stores your workspaces on your computer's filesystem.
                </p>
                <p className="mt-2">
                  Choose the location where you want to store this workspace.
                </p>
              </Help>
            </label>
            <div className="flex gap-2">
              <input
                id="workspace-location"
                type="text"
                name="workspaceLocation"
                readOnly={true}
                className="block textbox flex-1 bg-gray-50 cursor-pointer"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={formik.values.workspaceLocation || ''}
                onClick={browse}
              />
              <button type="button" className="btn btn-sm btn-secondary" onClick={browse}>
                Browse
              </button>
            </div>
            {formik.touched.workspaceLocation && formik.errors.workspaceLocation ? (
              <div className="text-red-500 text-sm mt-1">{formik.errors.workspaceLocation}</div>
            ) : null}
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateWorkspace;
