import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { validateName, validateNameError } from 'utils/common/regex';
import { loadMockResponses } from 'providers/ReduxStore/slices/mock-server/index';
import {
  cloneMockServerInstancePayload,
  getMockServerInstances,
  isMockServerNameTaken,
  isMockServerPortTaken,
  openMockServerDashboard,
  resolveTabCollectionUid,
  saveMockServerInstance,
  suggestNextMockServerPort
} from 'utils/mock-server/mock-server-instances';

const CloneMockServerModal = ({
  instance,
  workspacePath,
  workspaceCollections,
  activeWorkspace,
  onClose
}) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const configuredInstances = useSelector((state) => getMockServerInstances(state));
  const existingInstances = useSelector((state) => getMockServerInstances(state, activeWorkspaceUid));
  const suggestedPort = suggestNextMockServerPort(configuredInstances);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: `${instance.name} copy`,
      port: suggestedPort
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
          !isMockServerNameTaken(existingInstances, value)
        )),
      port: Yup.number()
        .min(1, 'Port must be at least 1')
        .max(65535, 'Port must be 65535 or less')
        .required('Port is required')
        .test('duplicate-port', 'This port is already used by another mock server', (value) => (
          !isMockServerPortTaken(configuredInstances, value)
        ))
    }),
    onSubmit: async (values) => {
      if (!workspacePath) {
        toast.error('Workspace path is required to clone mock responses');
        return;
      }

      const newInstance = cloneMockServerInstancePayload(instance, {
        name: values.name.trim(),
        port: Number(values.port),
        workspaceUid: activeWorkspaceUid
      });

      try {
        await dispatch(saveMockServerInstance(newInstance));

        const result = await window.ipcRenderer.invoke('renderer:mock-server-clone-responses', {
          workspacePath,
          sourceMockServerUid: instance.uid,
          targetMockServerUid: newInstance.uid
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        await dispatch(loadMockResponses({
          mockServerUid: newInstance.uid,
          workspacePath
        }));

        const tabCollectionUid = resolveTabCollectionUid({
          sourceType: newInstance.sourceType,
          collectionUid: newInstance.collectionUid,
          activeWorkspace,
          workspaceCollections
        });

        dispatch(openMockServerDashboard(newInstance, tabCollectionUid));
        toast.success('Mock server cloned');
        onClose();
      } catch (err) {
        toast.error(err.message || 'Failed to clone mock server');
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
        title="Clone Mock Server"
        confirmText="Clone"
        handleConfirm={() => formik.handleSubmit()}
        handleCancel={onClose}
        dataTestId="mock-server-clone-modal"
      >
        <form className="bruno-form" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label htmlFor="mock-server-clone-name" className="block font-medium">
              Name
            </label>
            <input
              id="mock-server-clone-name"
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
              data-testid="mock-server-clone-name-input"
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500 mt-1">{formik.errors.name}</div>
            ) : null}
          </div>

          <div className="mt-4">
            <label htmlFor="mock-server-clone-port" className="block font-medium">
              Port
            </label>
            <input
              id="mock-server-clone-port"
              type="number"
              name="port"
              className="block textbox w-full mt-2"
              min={1}
              max={65535}
              value={formik.values.port}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              data-testid="mock-server-clone-port-input"
            />
            {formik.touched.port && formik.errors.port ? (
              <div className="text-red-500 mt-1">{formik.errors.port}</div>
            ) : null}
          </div>

          <p className="text-xs opacity-70 mt-4">
            Clones mock responses and server settings. The clone starts stopped.
          </p>
        </form>
      </Modal>
    </Portal>
  );
};

export default CloneMockServerModal;
