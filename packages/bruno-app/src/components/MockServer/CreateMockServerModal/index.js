import React, { useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import get from 'lodash/get';
import toast from 'react-hot-toast';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { validateName, validateNameError } from 'utils/common/regex';
import { normalizePath } from 'utils/common/path';
import { isScratchCollection } from 'utils/collections';
import { matchLoadedApiSpecs } from 'components/Sidebar/ApiSpecs/matchLoadedApiSpecs';
import {
  createMockServerInstance,
  DEFAULT_MOCK_SERVER_PORT,
  getMockServerInstances,
  openMockServerDashboard,
  resolveTabCollectionUid,
  saveMockServerInstance
} from 'utils/mock-server-instances';

const resolveSelectedSpecUid = (editingInstance, apiSpecs) => {
  if (!editingInstance) {
    return '';
  }

  if (editingInstance.specUid && apiSpecs.some((spec) => spec.uid === editingInstance.specUid)) {
    return editingInstance.specUid;
  }

  if (editingInstance.specPath) {
    const matchingSpec = apiSpecs.find(
      (spec) => normalizePath(spec.pathname) === normalizePath(editingInstance.specPath)
    );
    if (matchingSpec) {
      return matchingSpec.uid;
    }
  }

  return editingInstance.specUid || '';
};

const toSpecOption = (spec, fallbackName = null) => ({
  uid: spec.uid,
  name: spec.name || spec.filename || fallbackName || spec.pathname,
  pathname: spec.pathname
});

const buildSpecSelectOptions = (workspaceSpecs, apiSpecs, editingInstance = null) => {
  const optionsByUid = new Map(
    workspaceSpecs.map((spec) => [spec.uid, toSpecOption(spec)])
  );

  apiSpecs.forEach((spec) => {
    if (!optionsByUid.has(spec.uid)) {
      optionsByUid.set(spec.uid, toSpecOption(spec));
    }
  });

  const selectedSpecUid = resolveSelectedSpecUid(editingInstance, apiSpecs) || editingInstance?.specUid;
  if (selectedSpecUid && !optionsByUid.has(selectedSpecUid)) {
    if (editingInstance?.specPath || editingInstance?.specName) {
      optionsByUid.set(selectedSpecUid, {
        uid: selectedSpecUid,
        name: editingInstance.specName || editingInstance.specPath,
        pathname: editingInstance.specPath
      });
    }
  }

  return Array.from(optionsByUid.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const resolveSpecDetails = (specUid, apiSpecs, editingInstance = null) => {
  const loadedSpec = apiSpecs.find((spec) => spec.uid === specUid);
  if (loadedSpec) {
    return {
      specPath: loadedSpec.pathname,
      specName: loadedSpec.name || loadedSpec.filename
    };
  }

  if (editingInstance?.specUid === specUid) {
    return {
      specPath: editingInstance.specPath || null,
      specName: editingInstance.specName || null
    };
  }

  return { specPath: null, specName: null };
};

const buildCollectionSelectOptions = (workspaceCollections, collections, editingInstance = null) => {
  const optionsByUid = new Map(
    workspaceCollections.map((collection) => [collection.uid, collection])
  );

  const selectedCollectionUid = editingInstance?.collectionUid;
  if (selectedCollectionUid && !optionsByUid.has(selectedCollectionUid)) {
    const loadedCollection = collections.find((collection) => collection.uid === selectedCollectionUid);
    if (loadedCollection) {
      optionsByUid.set(selectedCollectionUid, loadedCollection);
    }
  }

  return Array.from(optionsByUid.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const CreateMockServerModal = ({
  onClose,
  onDelete,
  editingInstance = null,
  defaultCollectionUid = null,
  defaultSourceType = 'collection'
}) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const preferences = useSelector((state) => state.app.preferences);
  const collections = useSelector((state) => state.collections.collections);
  const apiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => ({
    workspaces: state.workspaces.workspaces,
    activeWorkspaceUid: state.workspaces.activeWorkspaceUid
  }));

  const activeWorkspace = workspaces.find((workspace) => workspace.uid === activeWorkspaceUid);
  const mockMode = get(preferences, 'mockServer.mode', 'isolated');
  const isSharedMode = mockMode === 'shared';
  const isEditing = Boolean(editingInstance);

  const workspaceCollections = useMemo(() => {
    if (!activeWorkspace) {
      return [];
    }

    return collections.filter((collection) => {
      if (isScratchCollection(collection, workspaces)) {
        return false;
      }

      return activeWorkspace.collections?.some(
        (workspaceCollection) => normalizePath(workspaceCollection.path) === normalizePath(collection.pathname)
      );
    });
  }, [activeWorkspace, collections, workspaces]);

  const workspaceApiSpecs = useMemo(() => {
    if (!activeWorkspace) {
      return [];
    }

    return matchLoadedApiSpecs(activeWorkspace.apiSpecs, apiSpecs);
  }, [activeWorkspace, apiSpecs]);

  const specSelectOptions = useMemo(() => (
    buildSpecSelectOptions(workspaceApiSpecs, apiSpecs, editingInstance)
  ), [workspaceApiSpecs, apiSpecs, editingInstance]);

  const collectionSelectOptions = useMemo(() => (
    buildCollectionSelectOptions(workspaceCollections, collections, editingInstance)
  ), [workspaceCollections, collections, editingInstance]);

  const defaultCollection = workspaceCollections.find((collection) => collection.uid === defaultCollectionUid)
    || workspaceCollections[0]
    || null;
  const defaultSpec = specSelectOptions.find((spec) => spec.uid === resolveSelectedSpecUid(editingInstance, apiSpecs))
    || specSelectOptions[0]
    || null;

  const existingInstances = getMockServerInstances(preferences, activeWorkspaceUid);
  const initialSpecUid = editingInstance
    ? resolveSelectedSpecUid(editingInstance, apiSpecs)
    : (defaultSpec?.uid || '');

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: editingInstance?.name || (defaultCollection ? `${defaultCollection.name} Mock` : ''),
      sourceType: editingInstance?.sourceType || defaultSourceType,
      collectionUid: editingInstance?.collectionUid || defaultCollection?.uid || '',
      specUid: initialSpecUid,
      port: editingInstance?.port || DEFAULT_MOCK_SERVER_PORT,
      globalDelay: editingInstance?.globalDelay || 0
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
        .test('duplicate-name', 'A mock server with this name already exists', (value) => {
          const normalized = value?.trim().toLowerCase();
          return !existingInstances.some((instance) => (
            instance.name.trim().toLowerCase() === normalized && instance.uid !== editingInstance?.uid
          ));
        }),
      sourceType: Yup.string().oneOf(['collection', 'spec']).required('Source type is required'),
      collectionUid: Yup.string().when('sourceType', {
        is: 'collection',
        then: (schema) => schema.required('Collection is required'),
        otherwise: (schema) => schema.notRequired()
      }),
      specUid: Yup.string().when('sourceType', {
        is: 'spec',
        then: (schema) => schema.required('API spec is required'),
        otherwise: (schema) => schema.notRequired()
      }),
      port: Yup.number()
        .min(1, 'Port must be at least 1')
        .max(65535, 'Port must be 65535 or less')
        .required('Port is required'),
      globalDelay: Yup.number().min(0, 'Delay cannot be negative')
    }),
    onSubmit: async (values) => {
      if (!activeWorkspaceUid) {
        toast.error('No active workspace found');
        return;
      }

      const specDetails = values.sourceType === 'spec'
        ? resolveSpecDetails(values.specUid, apiSpecs, editingInstance)
        : { specPath: null, specName: null };

      const instance = editingInstance
        ? {
            ...editingInstance,
            name: values.name.trim(),
            sourceType: values.sourceType,
            collectionUid: values.sourceType === 'collection' ? values.collectionUid : null,
            specUid: values.sourceType === 'spec' ? values.specUid : null,
            specPath: values.sourceType === 'spec' ? specDetails.specPath : null,
            specName: values.sourceType === 'spec' ? specDetails.specName : null,
            port: Number(values.port),
            globalDelay: Number(values.globalDelay) || 0
          }
        : createMockServerInstance({
            name: values.name,
            sourceType: values.sourceType,
            collectionUid: values.collectionUid,
            specUid: values.specUid,
            specPath: specDetails.specPath,
            specName: specDetails.specName,
            port: values.port,
            globalDelay: values.globalDelay,
            workspaceUid: activeWorkspaceUid
          });

      try {
        await dispatch(saveMockServerInstance(instance));

        const tabCollectionUid = resolveTabCollectionUid({
          sourceType: values.sourceType,
          collectionUid: values.collectionUid,
          activeWorkspace,
          workspaceCollections
        });

        if (!isEditing) {
          dispatch(openMockServerDashboard(instance, tabCollectionUid));
        }

        toast.success(isEditing ? 'Mock server settings saved' : 'Mock server created');
        onClose();
      } catch {
        toast.error('Failed to save mock server');
      }
    }
  });

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (isSharedMode || isEditing) {
      return;
    }

    window.ipcRenderer.invoke('renderer:mock-server-suggest-port')
      .then((result) => {
        if (result?.success && result.port) {
          formik.setFieldValue('port', result.port);
        }
      })
      .catch(() => { });
  }, [isSharedMode, isEditing]);

  const handleConfirm = () => {
    formik.handleSubmit();
  };

  const handleDelete = () => {
    if (editingInstance && onDelete) {
      onDelete(editingInstance);
    }
  };

  return (
    <Portal>
      <Modal
        size="md"
        title={isEditing ? 'Mock Server Settings' : 'Create Mock Server'}
        confirmText={isEditing ? 'Save' : 'Create'}
        handleConfirm={handleConfirm}
        handleCancel={onClose}
        footerLeft={isEditing && onDelete ? (
          <Button type="button" color="danger" variant="ghost" onClick={handleDelete} data-testid="mock-server-delete-btn">
            Delete
          </Button>
        ) : null}
      >
        <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="mock-server-name" className="block font-medium">
              Name
            </label>
            <input
              id="mock-server-name"
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
              data-testid="mock-server-name-input"
            />
            {formik.touched.name && formik.errors.name ? (
              <div className="text-red-500 mt-1">{formik.errors.name}</div>
            ) : null}
          </div>

          <div className="mt-4">
            <label className="block font-medium mb-2">Source</label>
            <div className="flex items-center">
              <input
                id="mock-server-source-collection"
                className="cursor-pointer"
                type="radio"
                name="sourceType"
                value="collection"
                checked={formik.values.sourceType === 'collection'}
                onChange={formik.handleChange}
                data-testid="mock-server-source-collection"
              />
              <label htmlFor="mock-server-source-collection" className="ml-1 cursor-pointer select-none">
                Collection
              </label>
              <input
                id="mock-server-source-spec"
                className="ml-4 cursor-pointer"
                type="radio"
                name="sourceType"
                value="spec"
                checked={formik.values.sourceType === 'spec'}
                onChange={formik.handleChange}
                data-testid="mock-server-source-spec"
              />
              <label htmlFor="mock-server-source-spec" className="ml-1 cursor-pointer select-none">
                API Spec
              </label>
            </div>
          </div>

          {formik.values.sourceType === 'collection' ? (
            <div className="mt-4">
              <label htmlFor="mock-server-collection" className="block font-medium">
                Collection
              </label>
              <select
                id="mock-server-collection"
                name="collectionUid"
                className="textbox w-full mt-2"
                value={formik.values.collectionUid}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                data-testid="mock-server-collection-select"
              >
                <option value="">Select a collection</option>
                {collectionSelectOptions.map((collection) => (
                  <option key={collection.uid} value={collection.uid}>{collection.name}</option>
                ))}
              </select>
              {formik.touched.collectionUid && formik.errors.collectionUid ? (
                <div className="text-red-500 mt-1">{formik.errors.collectionUid}</div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <label htmlFor="mock-server-spec" className="block font-medium">
                API Spec
              </label>
              <select
                id="mock-server-spec"
                name="specUid"
                className="textbox w-full mt-2"
                value={formik.values.specUid}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                data-testid="mock-server-spec-select"
              >
                <option value="">Select an API spec</option>
                {specSelectOptions.map((spec) => (
                  <option key={spec.uid} value={spec.uid}>{spec.name}</option>
                ))}
              </select>
              {formik.touched.specUid && formik.errors.specUid ? (
                <div className="text-red-500 mt-1">{formik.errors.specUid}</div>
              ) : null}
              {!specSelectOptions.length ? (
                <div className="text-xs mt-2 opacity-70">Open an API spec in this workspace to use it as a source.</div>
              ) : null}
            </div>
          )}

          {!isSharedMode ? (
            <div className="mt-4">
              <label htmlFor="mock-server-port" className="block font-medium">
                Port
              </label>
              <input
                id="mock-server-port"
                type="number"
                name="port"
                className="block textbox w-full mt-2"
                min={1}
                max={65535}
                value={formik.values.port}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                data-testid="mock-server-port-input"
              />
              {formik.touched.port && formik.errors.port ? (
                <div className="text-red-500 mt-1">{formik.errors.port}</div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 text-xs opacity-70">
              Shared gateway mode uses a single port for all mock servers. Configure it in Preferences &gt; Beta.
            </div>
          )}

          <div className="mt-4">
            <label htmlFor="mock-server-delay" className="block font-medium">
              Response Delay (ms)
            </label>
            <input
              id="mock-server-delay"
              type="number"
              name="globalDelay"
              className="block textbox w-full mt-2"
              min={0}
              step={100}
              value={formik.values.globalDelay}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              data-testid="mock-server-delay-input"
            />
            {formik.touched.globalDelay && formik.errors.globalDelay ? (
              <div className="text-red-500 mt-1">{formik.errors.globalDelay}</div>
            ) : null}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default CreateMockServerModal;
