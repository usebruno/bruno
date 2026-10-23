import React, { useEffect, useRef } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal/index';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';
import { renameWorkspaceAction } from 'providers/ReduxStore/slices/workspaces/actions';

const RenameWorkspace = ({ onClose, workspace }) => {
  const dispatch = useDispatch();
  const inputRef = useRef();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: workspace.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .trim()
        .min(1, 'must be at least 1 character')
        .max(255, 'must be 255 characters or less')
        .required('name is required')
    }),
    onSubmit: (values) => {
      const name = values.name.trim();
      if (name === workspace.name) {
        onClose();
        return;
      }
      dispatch(renameWorkspaceAction(workspace.uid, name))
        .then(() => {
          onClose();
        })
        .catch((error) => {
          toast.error(error?.message || 'An error occurred while renaming the workspace');
        });
    }
  });

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inputRef]);

  const onSubmit = () => {
    formik.handleSubmit();
  };

  return (
    <Portal>
      <Modal
        size="md"
        title="Rename Workspace"
        confirmText="Rename"
        handleConfirm={onSubmit}
        handleCancel={onClose}
        dataTestId="rename-workspace-modal"
      >
        <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="workspace-name" className="block font-semibold">
              Workspace Name
            </label>
            <input
              id="workspace-name"
              type="text"
              name="name"
              ref={inputRef}
              data-testid="workspace-name-input"
              className="block textbox mt-2 w-full"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              value={formik.values.name || ''}
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500" data-testid="workspace-name-error">{formik.errors.name}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default RenameWorkspace;
