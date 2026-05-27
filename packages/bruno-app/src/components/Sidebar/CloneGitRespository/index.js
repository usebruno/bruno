import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  browseDirectory,
  cloneGitRepository,
  openMultipleCollections,
  scanForBrunoFiles
} from 'providers/ReduxStore/slices/collections/actions';
import { removeGitOperationProgress } from 'providers/ReduxStore/slices/app';
import Modal from 'components/Modal';
import SelectionFooter from 'components/SelectionFooter';
import path, { getRelativePath } from 'utils/common/path';
import Portal from 'components/Portal';
import { IconRefresh, IconAlertCircle, IconBrandGit } from '@tabler/icons';
import { uuid } from 'utils/common/index';
import StyledWrapper from './StyledWrapper';
import SelectionList from 'components/SelectionList';
import { getRepoNameFromUrl } from 'utils/git';
import GitNotFoundModal from 'components/Git/GitNotFoundModal/index';
import ScanWarning from 'components/ScanWarning';
import SkippedPathsWarning from 'components/SkippedPathsWarning';
import toast from 'react-hot-toast';
import get from 'lodash/get';

const CloneGitRepository = ({ onClose, onFinish, collectionRepositoryUrl = null }) => {
  const [collectionPaths, setCollectionPaths] = useState([]);
  const [skippedCollectionPaths, setSkippedCollectionPaths] = useState([]);
  const [selectedCollectionPaths, setSelectedCollectionPaths] = useState([]);
  const [processUid, setProcessUid] = useState(uuid());
  const [steps, setSteps] = useState([]);
  const [view, setView] = useState('form');

  const progressData = useSelector((state) => state.app.gitOperationProgress[processUid]);
  const { gitVersion } = useSelector((state) => state.app);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const preferences = useSelector((state) => state.app.preferences);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const isDefaultWorkspace = !activeWorkspace || activeWorkspace.type === 'default';
  const defaultLocation = isDefaultWorkspace
    ? get(preferences, 'general.defaultLocation', '')
    : (activeWorkspace?.pathname ? path.join(activeWorkspace.pathname, 'collections') : '');
  const inputRef = useRef();
  const dispatch = useDispatch();

  useEffect(() => {
    if (progressData) {
      setSteps((prev) =>
        prev.map((step) =>
          step.step === 'clone' && !step?.completed
            ? { ...step, title: 'Cloning repository', completed: false, info: progressData.progressData }
            : step
        )
      );
    }
  }, [progressData]);

  useEffect(() => {
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  }, []);

  const cloneInProgress = () => {
    setSteps((prev) => [
      ...prev,
      {
        step: 'clone',
        title: 'Cloning repository',
        completed: false
      }
    ]);
  };

  const cloneFinished = () => {
    toast.success('Repository cloned successfully');
    setSteps((prev) =>
      prev.map((step) =>
        step.step === 'clone'
          ? { ...step, title: 'Cloning successful', completed: true, info: '' }
          : step
      )
    );
  };

  const cloneError = () => {
    setSteps((prev) =>
      prev.map((step) =>
        step.step === 'clone'
          ? { ...step, title: 'Cloning failed', completed: true, error: true }
          : step
      )
    );
  };

  const scanInProgress = () => {
    setSteps((prev) => [
      ...prev,
      {
        step: 'scan',
        title: 'Scanning for Bruno files',
        completed: false
      }
    ]);
  };

  const scanFinished = () => {
    toast.success('Repository scanned successfully');
    setSteps((prev) =>
      prev.map((step) =>
        step.step === 'scan' ? { ...step, title: 'Scan successful', completed: true, info: '' } : step
      )
    );
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      repositoryUrl: collectionRepositoryUrl || '',
      collectionLocation: defaultLocation
    },
    validationSchema: Yup.object({
      repositoryUrl: Yup.string().required('Repository URL is required'),
      collectionLocation: Yup.string().min(1, 'Location is required').required('Location is required')
    }),
    onSubmit: async (values) => {
      try {
        setView('progress');
        cloneInProgress();
        const { repositoryUrl, collectionLocation } = values;

        const repoName = getRepoNameFromUrl(repositoryUrl);
        const targetPath = path.join(collectionLocation, repoName);

        await dispatch(cloneGitRepository({ url: values.repositoryUrl, path: targetPath, processUid }));

        cloneFinished();
        dispatch(removeGitOperationProgress(processUid));

        scanInProgress();
        const scanResult = await dispatch(scanForBrunoFiles(targetPath));

        scanFinished();
        setCollectionPaths(scanResult?.items || []);
        setSkippedCollectionPaths(scanResult?.skippedItems || []);
      } catch (err) {
        cloneError();
        dispatch(removeGitOperationProgress(processUid));
        console.error(err);
      }
    }
  });

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          formik.setFieldValue('collectionLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('collectionLocation', '');
        console.error(error);
      });
  };

  const handleCollectionSelect = (collectionPathname) => {
    setSelectedCollectionPaths((prevSelected) =>
      prevSelected.includes(collectionPathname)
        ? prevSelected.filter((pathname) => pathname !== collectionPathname)
        : [...prevSelected, collectionPathname]
    );
  };

  const handleSelectAllCollections = (e, filteredCollectionPaths) => {
    setSelectedCollectionPaths((prevSelected) => (
      e.target.checked
        ? Array.from(new Set([...prevSelected, ...filteredCollectionPaths]))
        : prevSelected.filter((pathname) => !filteredCollectionPaths.includes(pathname))
    ));
  };

  const isScanCompleted = () => steps.some((step) => step.step === 'scan' && step.completed);

  const isConfirmDisabled = () => isScanCompleted() && collectionPaths?.length > 0 && selectedCollectionPaths?.length === 0;

  const isFooterHidden = () => steps.some((step) => !step.completed);

  const isError = () => steps.some((step) => step.error);

  const footerLeft = isScanCompleted() && collectionPaths?.length > 0
    ? (
        <SelectionFooter>
          <span>{selectedCollectionPaths.length}</span> of {collectionPaths.length} selected
        </SelectionFooter>
      )
    : null;

  const handleConfirm = () => {
    const buttonText = getConfirmText();
    switch (buttonText) {
      case 'Clone':
        formik.handleSubmit();
        break;
      case 'Close':
        onClose();
        break;
      case 'Open':
        if (collectionPaths.length > 0 && selectedCollectionPaths.length > 0) {
          dispatch(openMultipleCollections(selectedCollectionPaths));
          onClose();
          onFinish();
        }
        break;
      default:
        break;
    }
  };

  const getConfirmText = () =>
    !steps.length
      ? 'Clone'
      : steps.some((step) => !step.completed || step.error || (isScanCompleted() && !collectionPaths?.length))
        ? 'Close'
        : 'Open';

  const handleBackButtonClick = () => {
    setView('form');
    setSteps([]);
    setSelectedCollectionPaths([]);
  };

  if (!gitVersion) {
    return <GitNotFoundModal onClose={onClose} />;
  }

  return (
    <Portal id="clone-repository-portal">
      <Modal
        size="md"
        title="Clone Git Repository"
        confirmText={getConfirmText()}
        handleConfirm={handleConfirm}
        handleCancel={onClose}
        confirmDisabled={isConfirmDisabled()}
        hideFooter={isFooterHidden()}
        hideCancel={isError() || (isScanCompleted() && !collectionPaths?.length)}
        showBackButton={isError()}
        handleBack={handleBackButtonClick}
        footerLeft={footerLeft}
      >
        <StyledWrapper>
          {view === 'form' && (
            <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
              <div>
                {collectionRepositoryUrl
                  ? (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <IconBrandGit className="w-6 h-6 text-purple-500" stroke={1.5} />
                        </div>
                        <div className="ml-4">
                          <div className="font-semibold text-sm">{getRepoNameFromUrl(collectionRepositoryUrl)}</div>
                          <div className="mt-1 text-xs text-muted font-mono">
                            {collectionRepositoryUrl}
                          </div>
                        </div>
                      </div>
                    )
                  : (
                      <>
                        <label htmlFor="repository-url" className="flex items-center font-semibold">
                          Git Repository URL
                        </label>
                        <input
                          id="repository-url"
                          type="text"
                          name="repositoryUrl"
                          ref={inputRef}
                          className="block textbox mt-2 w-full"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          onChange={formik.handleChange}
                          value={formik.values.repositoryUrl || ''}
                        />
                      </>
                    )}
                {formik.touched.repositoryUrl && formik.errors.repositoryUrl && (
                  <div className="text-red-500">{formik.errors.repositoryUrl}</div>
                )}
                <label htmlFor="collection-location" className="block font-semibold mt-3">
                  Location
                </label>
                <input
                  id="collection-location"
                  type="text"
                  name="collectionLocation"
                  readOnly
                  className="block textbox mt-2 w-full cursor-pointer"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  value={formik.values.collectionLocation || ''}
                  onClick={browse}
                />
                {formik.touched.collectionLocation && formik.errors.collectionLocation && (
                  <div className="text-red-500">{formik.errors.collectionLocation}</div>
                )}
                <div className="mt-1">
                  <span className="text-link cursor-pointer hover:underline" onClick={browse}>
                    Browse
                  </span>
                </div>
              </div>
            </form>
          )}
          {view === 'progress' && (
            <>
              {steps.some((step) => !step.completed || step.error) && (
                <div className="clone-progress-steps">
                  <ul>
                    {steps.filter((step) => !step.completed || step.error).map((step, index) => (
                      <li key={index} className="flex-col items-center space-x-2 mt-1">
                        <div className="flex">
                          {step.error ? (
                            <IconAlertCircle className="clone-step-error-icon" size={18} strokeWidth={1.5} />
                          ) : (
                            <IconRefresh className="clone-step-progress-icon animate-spin" size={18} strokeWidth={1.5} />
                          )}
                          <span className="ml-2">{step.title}</span>
                        </div>
                        {step.info && (
                          <div className="w-full mt-2">
                            <pre className="info-box ml-4">{step.info}</pre>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {isScanCompleted() && (
                <div className="w-full min-w-0 flex flex-col gap-3">
                  <SkippedPathsWarning paths={skippedCollectionPaths} itemNoun="collections" />
                  {collectionPaths.length === 0 && (
                    <ScanWarning className="flex items-start gap-2">
                      <IconAlertCircle className="scan-warning-icon" size={18} strokeWidth={1.5} />
                      <div>No Bruno collections were found in this repository.</div>
                    </ScanWarning>
                  )}
                  {collectionPaths.length > 0 && (
                    <SelectionList
                      title="Collections"
                      searchPlaceholder="Search Collections"
                      items={collectionPaths}
                      selectedItems={selectedCollectionPaths}
                      onSelectAll={handleSelectAllCollections}
                      onItemToggle={handleCollectionSelect}
                      getItemId={(collection) => collection.pathname}
                      renderItemTitle={(collection) => collection.name}
                      renderItemDescription={(collection) => getRelativePath(formik.values.collectionLocation, collection.pathname)}
                      visibleRows={8}
                      rowHeight={60}
                      rowGap={4}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default CloneGitRepository;
