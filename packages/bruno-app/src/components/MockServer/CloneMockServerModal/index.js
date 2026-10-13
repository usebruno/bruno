import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { loadMockResponses } from 'providers/ReduxStore/slices/mock-server/index';
import {
  cloneMockServerInstancePayload,
  checkMockServerPortAvailable,
  DEFAULT_MOCK_SERVER_PORT,
  getMockServerInstances,
  getMockServerNameError,
  getMockServerPortError,
  getMockServerPortRangeError,
  isMockServerNameTaken,
  isMockServerPortTaken,
  openMockServerDashboard,
  resolveTabCollectionUid,
  saveMockServerInstance,
  suggestAvailableMockServerPort
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
  const configuredInstances = useSelector((state) => getMockServerInstances(state), shallowEqual);
  const existingInstances = useSelector((state) => getMockServerInstances(state, activeWorkspaceUid));

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: `${instance.name} copy`,
      port: DEFAULT_MOCK_SERVER_PORT
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .trim()
        .min(1, 'Must be at least 1 character')
        .max(255, 'Must be 255 characters or less')
        .test('is-valid-name', function (value) {
          const error = getMockServerNameError(value);
          return error ? this.createError({ message: error }) : true;
        })
        .required('Name is required')
        .test('duplicate-name', 'A mock server with this name already exists', (value) => (
          !isMockServerNameTaken(existingInstances, value)
        )),
      port: Yup.mixed()
        .test('port-range', function (value) {
          const error = getMockServerPortRangeError(value);
          return error ? this.createError({ message: error }) : true;
        })
        .test('duplicate-port', 'This port is already used by another mock server', (value) => {
          const normalizedPort = Number(value);
          if (!normalizedPort) {
            return true;
          }

          return !isMockServerPortTaken(configuredInstances, normalizedPort);
        })
    }),
    onSubmit: async (values, { setFieldError }) => {
      if (!workspacePath) {
        toast.error('Workspace path is required to clone mock responses');
        return;
      }

      const resolvedPort = Number(values.port);
      try {
        const portCheck = await checkMockServerPortAvailable(resolvedPort, configuredInstances);
        const availabilityError = getMockServerPortError(portCheck, resolvedPort);
        if (availabilityError) {
          setFieldError('port', availabilityError);
          return;
        }
      } catch (err) {
        setFieldError('port', err.message || 'Failed to validate port');
        return;
      }

      const newInstance = cloneMockServerInstancePayload(instance, {
        name: values.name.trim(),
        port: resolvedPort,
        workspaceUid: activeWorkspaceUid
      });

      try {
        const savedInstance = await dispatch(saveMockServerInstance(newInstance));

        const result = await window.ipcRenderer.invoke('renderer:mock-server-clone-responses', {
          workspacePath,
          sourceMockServerUid: instance.uid,
          targetMockServerUid: savedInstance.uid
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        await dispatch(loadMockResponses({
          mockServerUid: savedInstance.uid,
          workspacePath
        }));

        const tabCollectionUid = resolveTabCollectionUid({
          sourceType: savedInstance.sourceType,
          collectionUid: savedInstance.collectionUid,
          activeWorkspace,
          workspaceCollections
        });

        dispatch(openMockServerDashboard(savedInstance, tabCollectionUid));
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

  useEffect(() => {
    let cancelled = false;

    suggestAvailableMockServerPort(configuredInstances).then((port) => {
      if (!cancelled) {
        formik.setFieldValue('port', port);
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [configuredInstances]);

  return (
    <Portal>
      <Modal
        size="md"
        title="Clone Mock Server"
        confirmText="Clone"
        handleConfirm={async () => {
          const errors = await formik.validateForm();
          if (Object.keys(errors).length > 0) {
            formik.setTouched(Object.keys(errors).reduce((touched, key) => ({
              ...touched,
              [key]: true
            }), formik.touched));
            return;
          }

          formik.handleSubmit();
        }}
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
              value={formik.values.port || ''}
              onChange={(event) => {
                formik.setFieldValue('port', event.target.value ? Number(event.target.value) : '');
                if (formik.errors.port) {
                  formik.setFieldError('port', undefined);
                }
              }}
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
