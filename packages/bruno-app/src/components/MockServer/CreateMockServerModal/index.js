import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { IconCaretDown, IconTrash } from '@tabler/icons';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { normalizePath } from 'utils/common/path';
import { isScratchCollection } from 'utils/collections';
import { matchLoadedApiSpecs } from 'components/Sidebar/ApiSpecs/matchLoadedApiSpecs';
import {
  DEFAULT_MOCK_SERVER_PORT,
  createMockServerInstance,
  getMockServerInstances,
  checkMockServerPortAvailable,
  getMockServerPortError,
  getMockServerPortRangeError,
  getMockServerNameError,
  openMockServerDashboard,
  resolveTabCollectionUid,
  saveMockServerInstance,
  suggestAvailableMockServerPort,
  updateMockServerTabName,
  toMockServerDelayInputValue,
  blockMockServerDelayKeys
} from 'utils/mock-server/mock-server-instances';

const resolveSelectedSpecUid = (editingInstance, apiSpecs) => {
  if (!editingInstance?.specPath) {
    return '';
  }

  const matchingSpec = apiSpecs.find(
    (spec) => normalizePath(spec.pathname) === normalizePath(editingInstance.specPath)
  );
  return matchingSpec?.uid || '';
};

const toSpecOption = (spec, fallbackName = null) => ({
  uid: spec.uid,
  name: spec.name || spec.filename || fallbackName || spec.pathname,
  pathname: spec.pathname
});

const buildSpecSelectOptions = (workspaceSpecs, editingInstance = null) => {
  const optionsByUid = new Map(
    workspaceSpecs.map((spec) => [spec.uid, toSpecOption(spec)])
  );

  const selectedSpecUid = resolveSelectedSpecUid(editingInstance, workspaceSpecs);
  if (!selectedSpecUid && editingInstance?.specPath) {
    optionsByUid.set(editingInstance.specPath, {
      uid: editingInstance.specPath,
      name: editingInstance.specPath.split(/[\\/]/).pop(),
      pathname: editingInstance.specPath
    });
  }

  return Array.from(optionsByUid.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const resolveSpecPath = (specUid, apiSpecs, editingInstance = null) => {
  const loadedSpec = apiSpecs.find((spec) => spec.uid === specUid);
  if (loadedSpec) {
    return loadedSpec.pathname;
  }

  if (editingInstance?.specPath && (
    editingInstance.specPath === specUid
    || normalizePath(editingInstance.specPath) === normalizePath(specUid)
  )) {
    return editingInstance.specPath;
  }

  return null;
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
  const [showAdvancedPort, setShowAdvancedPort] = useState(Boolean(editingInstance));
  // Kept in state so enableReinitialize cannot wipe a suggested free port back to 4000
  // when collections/specs finish loading after the modal opens.
  const [suggestedPort, setSuggestedPort] = useState(editingInstance?.port || DEFAULT_MOCK_SERVER_PORT);
  const collections = useSelector((state) => state.collections.collections);
  const apiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => ({
    workspaces: state.workspaces.workspaces,
    activeWorkspaceUid: state.workspaces.activeWorkspaceUid
  }));

  const activeWorkspace = workspaces.find((workspace) => workspace.uid === activeWorkspaceUid);
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
    buildSpecSelectOptions(workspaceApiSpecs, editingInstance)
  ), [workspaceApiSpecs, editingInstance]);

  const collectionSelectOptions = useMemo(() => (
    buildCollectionSelectOptions(workspaceCollections, collections, editingInstance)
  ), [workspaceCollections, collections, editingInstance]);

  const defaultCollection = defaultCollectionUid
    ? workspaceCollections.find((collection) => collection.uid === defaultCollectionUid) || null
    : null;

  const existingInstances = useSelector((state) => getMockServerInstances(state, activeWorkspaceUid));

  const configuredInstances = useSelector((state) => getMockServerInstances(state), shallowEqual);
  const hasCollectionOptions = collectionSelectOptions.length > 0;
  const hasSpecOptions = specSelectOptions.length > 0;
  const canLinkSource = hasCollectionOptions || hasSpecOptions;
  const initialCollectionUid = editingInstance?.collectionUid || defaultCollection?.uid || '';
  const initialSpecUid = editingInstance
    ? (resolveSelectedSpecUid(editingInstance, workspaceApiSpecs) || editingInstance.specPath || '')
    : '';

  const requiresPortField = showAdvancedPort || isEditing;

  const validationSchema = useMemo(() => Yup.object({
    name: Yup.string()
      .trim()
      .min(1, 'Must be at least 1 character')
      .max(255, 'Must be 255 characters or less')
      .test('is-valid-name', function (value) {
        const error = getMockServerNameError(value);
        return error ? this.createError({ message: error }) : true;
      })
      .required('Name is required')
      .test('duplicate-name', 'A mock server with this name already exists', (value) => {
        const normalized = value?.trim().toLowerCase();
        return !existingInstances.some((instance) => (
          instance.name.trim().toLowerCase() === normalized && instance.uid !== editingInstance?.uid
        ));
      }),
    linkSource: Yup.boolean(),
    sourceType: Yup.string().oneOf(['collection', 'spec']),
    collectionUid: Yup.string().when(['linkSource', 'sourceType'], {
      is: (linked, sourceType) => linked && sourceType === 'collection',
      then: (schema) => schema.required('Collection is required'),
      otherwise: (schema) => schema.notRequired()
    }),
    specUid: Yup.string().when(['linkSource', 'sourceType'], {
      is: (linked, sourceType) => linked && sourceType === 'spec',
      then: (schema) => schema.required('API spec is required'),
      otherwise: (schema) => schema.notRequired()
    }),
    port: Yup.mixed().test('port-range', function (value) {
      if (!requiresPortField) {
        return true;
      }

      const error = getMockServerPortRangeError(value);
      return error ? this.createError({ message: error }) : true;
    }),
    globalDelay: Yup.number().min(0, 'Delay cannot be negative')
  }, [['sourceType', 'linkSource']]), [requiresPortField, existingInstances, editingInstance?.uid]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: editingInstance?.name || 'New Mock Server',
      sourceType: editingInstance?.sourceType === 'manual' ? 'collection' : (editingInstance?.sourceType || defaultSourceType),
      collectionUid: initialCollectionUid,
      specUid: initialSpecUid,
      port: editingInstance?.port || suggestedPort,
      globalDelay: editingInstance?.globalDelay || 0,
      linkSource: editingInstance ? editingInstance.sourceType !== 'manual' : canLinkSource
    },
    validationSchema,
    onSubmit: async (values, { setFieldError }) => {
      if (!activeWorkspaceUid) {
        toast.error('No active workspace found');
        return;
      }

      let resolvedPort = Number(values.port);
      const portUnchanged = isEditing && Number(editingInstance.port) === resolvedPort;

      // Advanced closed: pick a free port at create time (matches the helper copy).
      // Advanced open / edit: validate unless this mock is keeping its current port
      // (a running instance would otherwise look like a system conflict).
      if (!isEditing && !showAdvancedPort) {
        resolvedPort = await suggestAvailableMockServerPort(configuredInstances, {
          excludeUid: editingInstance?.uid
        });
      } else if (!portUnchanged) {
        try {
          const portCheck = await checkMockServerPortAvailable(resolvedPort, configuredInstances, {
            excludeUid: editingInstance?.uid
          });
          const availabilityError = getMockServerPortError(portCheck, resolvedPort);
          if (availabilityError) {
            setFieldError('port', availabilityError);
            return;
          }
        } catch (err) {
          setFieldError('port', err.message || 'Failed to validate port');
          return;
        }
      }

      const resolvedSourceType = values.linkSource ? values.sourceType : 'manual';
      const specPath = resolvedSourceType === 'spec'
        ? resolveSpecPath(values.specUid, apiSpecs, editingInstance)
        : null;
      const collectionPathname = resolvedSourceType === 'collection'
        ? collectionSelectOptions.find((collection) => collection.uid === values.collectionUid)?.pathname || null
        : null;

      const instance = editingInstance
        ? {
            uid: editingInstance.uid,
            workspaceUid: editingInstance.workspaceUid,
            name: values.name.trim(),
            sourceType: resolvedSourceType,
            collectionUid: resolvedSourceType === 'collection' ? values.collectionUid : null,
            collectionPathname,
            specPath: resolvedSourceType === 'spec' ? specPath : null,
            port: resolvedPort,
            globalDelay: Number(values.globalDelay) || 0
          }
        : createMockServerInstance({
            name: values.name,
            sourceType: resolvedSourceType,
            collectionUid: values.collectionUid,
            collectionPathname,
            specPath,
            port: resolvedPort,
            globalDelay: values.globalDelay,
            workspaceUid: activeWorkspaceUid
          });

      try {
        const savedInstance = await dispatch(saveMockServerInstance(instance));

        const tabCollectionUid = resolveTabCollectionUid({
          sourceType: resolvedSourceType,
          collectionUid: values.collectionUid,
          activeWorkspace,
          workspaceCollections
        });

        if (isEditing) {
          dispatch(updateMockServerTabName(savedInstance));
        } else {
          dispatch(openMockServerDashboard(savedInstance, tabCollectionUid));
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
    if (isEditing) {
      return;
    }

    let cancelled = false;

    suggestAvailableMockServerPort(configuredInstances, {
      excludeUid: editingInstance?.uid
    }).then((port) => {
      if (!cancelled) {
        setSuggestedPort(port);
        formik.setFieldValue('port', port);
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isEditing, configuredInstances, editingInstance?.uid]);

  const handleConfirm = async () => {
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(Object.keys(errors).reduce((touched, key) => ({
        ...touched,
        [key]: true
      }), formik.touched));
      return;
    }

    formik.handleSubmit();
  };

  const handleCancel = () => {
    formik.resetForm({ values: formik.values });
    onClose();
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
        handleCancel={handleCancel}
        footerLeft={isEditing && onDelete ? (
          <Button
            type="button"
            color="danger"
            variant="outline"
            icon={<IconTrash size={15} stroke={1.5} />}
            onClick={handleDelete}
            data-testid="mock-server-delete-btn"
          >
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
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-1 cursor-pointer"
                checked={formik.values.linkSource}
                onChange={(event) => {
                  formik.setFieldValue('linkSource', event.target.checked);
                }}
                data-testid="mock-server-link-source-checkbox"
              />
              <span>
                <span className="block font-medium">Link to a collection or API spec</span>
                <span className="block text-xs opacity-70 mt-1">
                  Turn this off to create a standalone mock server and add responses manually.
                </span>
              </span>
            </label>
          </div>

          {formik.values.linkSource ? (
            <>
              <div className="mt-4">
                <label className="block font-medium mb-2">Source</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      id="mock-server-source-collection"
                      type="radio"
                      name="sourceType"
                      value="collection"
                      checked={formik.values.sourceType === 'collection'}
                      onChange={formik.handleChange}
                      disabled={!hasCollectionOptions}
                      data-testid="mock-server-source-collection"
                    />
                    <label htmlFor="mock-server-source-collection" className="cursor-pointer select-none">
                      Collection
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="mock-server-source-spec"
                      type="radio"
                      name="sourceType"
                      value="spec"
                      checked={formik.values.sourceType === 'spec'}
                      onChange={formik.handleChange}
                      disabled={!hasSpecOptions}
                      data-testid="mock-server-source-spec"
                    />
                    <label htmlFor="mock-server-source-spec" className="cursor-pointer select-none">
                      API Spec
                    </label>
                  </div>
                </div>
              </div>

              {formik.values.sourceType === 'collection' ? (
                <div className="mt-4">
                  <label htmlFor="mock-server-collection" className="block font-medium">
                    Collection
                  </label>
                  {hasCollectionOptions ? (
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
                  ) : (
                    <div className="text-xs mt-2 opacity-70">Open a collection in this workspace to link it here.</div>
                  )}
                  {formik.touched.collectionUid && formik.errors.collectionUid ? (
                    <div className="text-red-500 mt-1">{formik.errors.collectionUid}</div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4">
                  <label htmlFor="mock-server-spec" className="block font-medium">
                    API Spec
                  </label>
                  {hasSpecOptions ? (
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
                  ) : (
                    <div className="text-xs mt-2 opacity-70">Open an API spec in this workspace to link it here.</div>
                  )}
                  {formik.touched.specUid && formik.errors.specUid ? (
                    <div className="text-red-500 mt-1">{formik.errors.specUid}</div>
                  ) : null}
                </div>
              )}
            </>
          ) : null}

          <div className="mt-4">
            <button
              type="button"
              className="flex items-center text-link"
              onClick={() => setShowAdvancedPort((value) => !value)}
              data-testid="mock-server-advanced-settings-toggle"
            >
              Advanced settings
              <IconCaretDown className={`ml-1 ${showAdvancedPort ? 'rotate-180' : ''}`} size={14} strokeWidth={2} />
            </button>
            {showAdvancedPort ? (
              <>
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
                    value={formik.values.port || ''}
                    onChange={(event) => {
                      formik.setFieldValue('port', event.target.value ? Number(event.target.value) : '');
                      if (formik.errors.port) {
                        formik.setFieldError('port', undefined);
                      }
                    }}
                    onBlur={async (event) => {
                      formik.handleBlur(event);
                      const rangeError = getMockServerPortRangeError(event.target.value);
                      if (rangeError) {
                        formik.setFieldError('port', rangeError);
                        return;
                      }

                      if (editingInstance && Number(editingInstance.port) === Number(event.target.value)) {
                        formik.setFieldError('port', undefined);
                        return;
                      }

                      try {
                        const portCheck = await checkMockServerPortAvailable(event.target.value, configuredInstances, {
                          excludeUid: editingInstance?.uid
                        });
                        formik.setFieldError('port', getMockServerPortError(portCheck, event.target.value) || undefined);
                      } catch (err) {
                        formik.setFieldError('port', err.message || 'Failed to validate port');
                      }
                    }}
                    data-testid="mock-server-port-input"
                  />
                  {formik.touched.port && formik.errors.port ? (
                    <div className="text-red-500 mt-1">{formik.errors.port}</div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <label htmlFor="mock-server-delay" className="block font-medium">
                    Response delay (ms)
                  </label>
                  <input
                    id="mock-server-delay"
                    type="number"
                    name="globalDelay"
                    className="block textbox w-full mt-2"
                    min={0}
                    step={100}
                    value={formik.values.globalDelay}
                    onChange={(event) => formik.setFieldValue('globalDelay', toMockServerDelayInputValue(event.target.value))}
                    onKeyDown={blockMockServerDelayKeys}
                    onBlur={formik.handleBlur}
                    data-testid="mock-server-settings-delay-input"
                  />
                  {formik.touched.globalDelay && formik.errors.globalDelay ? (
                    <div className="text-red-500 mt-1">{formik.errors.globalDelay}</div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-xs mt-2 opacity-70">
                Bruno will pick the next available port automatically.
              </div>
            )}
          </div>
        </form>
      </Modal>
    </Portal>
  );
};

export default CreateMockServerModal;
