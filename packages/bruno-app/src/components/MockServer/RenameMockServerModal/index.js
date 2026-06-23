import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { validateName, validateNameError } from 'utils/common/regex';
import {
  findMockServerInstance,
  getMockServerInstances,
  isMockServerNameTaken,
  saveMockServerInstance,
  updateMockServerTabName
} from 'utils/mock-server-instances';

const RenameMockServerModal = ({ instance, onClose }) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const preferences = useSelector((state) => state.app.preferences);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const storedInstance = useSelector((state) => (
    findMockServerInstance(state.app.preferences, instance.uid) || instance
  ));
  const existingInstances = getMockServerInstances(preferences, activeWorkspaceUid);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: storedInstance.name
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(1, 'Must be at least 1 character')
        .max(255, 'Must be 255 characters or less')
        .test('is-valid-name', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .required('Name is required')
        .test('duplicate-name', 'A mock server with this name already exists', (value) => (
          !isMockServerNameTaken(existingInstances, value, storedInstance.uid)
        ))
    }),
    onSubmit: async (values) => {
      const nextInstance = {
        ...storedInstance,
        name: values.name.trim()
      };

      try {
        await dispatch(saveMockServerInstance(nextInstance));
        dispatch(updateMockServerTabName(nextInstance));
        toast.success('Mock server renamed');
        onClose();
      } catch {
        toast.error('Failed to rename mock server');
      }
    }
  });

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  return (
    <Portal>
      <Modal
        size="md"
        title="Rename Mock Server"
        confirmText="Rename"
        handleConfirm={() => formik.handleSubmit()}
        handleCancel={onClose}
        dataTestId="mock-server-rename-modal"
      >
        <form className="bruno-form" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label htmlFor="mock-server-rename-name" className="block font-medium">
              Name
            </label>
            <input
              id="mock-server-rename-name"
              type="text"
              name="name"
              ref={inputRef}
              className="block textbox w-full mt-2"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              data-testid="mock-server-rename-name-input"
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500 mt-1">{formik.errors.name}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default RenameMockServerModal;
