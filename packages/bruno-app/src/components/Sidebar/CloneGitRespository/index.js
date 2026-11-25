import React, { Fragment, useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import classnames from 'classnames';
import * as Yup from 'yup';
import {
  browseDirectory,
  cloneGitRepository,
  findCollectionsInClonedRepository,
  openMultipleCollections
} from 'providers/ReduxStore/slices/collections/actions';
import { removeGitOperationProgress } from 'providers/ReduxStore/slices/app';
import Modal from 'components/Modal';
import SelectionFooter from 'components/SelectionFooter';
import path, { getRelativePath } from 'utils/common/path';
import Portal from 'components/Portal';
import InlineLayout from './InlineLayout';
import useBranchListing from './useBranchListing';
import { IconRefresh, IconAlertCircle, IconBrandGit, IconChevronDown } from '@tabler/icons';
import { uuid } from 'utils/common/index';
import StyledWrapper from './StyledWrapper';
import SelectionList from 'components/SelectionList';
import Button from 'ui/Button';
import Select from 'ui/Select';
import { getRepoNameFromUrl, hasUrlCredentials, isGitRepositoryUrl } from 'utils/git';
import GitNotFoundModal from 'components/Git/GitNotFoundModal/index';
import SkippedPathsWarning from 'components/SkippedPathsWarning';
import toast from 'react-hot-toast';
import get from 'lodash/get';

const CloneGitRepository = ({ onClose, onFinish, onOpenCollections, onBusyChange = () => {}, collectionRepositoryUrl = null, initialUrl = '', variant = 'modal', isHidden = false }) => {
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

  const scanError = () => {
    setSteps((prev) =>
      prev.map((step) =>
        step.step === 'scan' ? { ...step, title: 'Scan failed', completed: true, error: true } : step
      )
    );
  };

  const findClonedCollections = async (targetPath) => {
    scanInProgress();
    try {
      const scanResult = await dispatch(findCollectionsInClonedRepository(targetPath));
      scanFinished();
      setCollectionPaths(scanResult?.items || []);
      setSkippedCollectionPaths(scanResult?.skippedItems || []);
    } catch (err) {
      scanError();
      console.error(err);
    }
  };

  const formik = useFormik({
    initialValues: {
      repositoryUrl: collectionRepositoryUrl || initialUrl,
      collectionLocation: defaultLocation,
      branch: ''
    },
    validationSchema: Yup.object({
      repositoryUrl: Yup.string()
        .required('Repository URL is required')
        .test('is-git-url', 'Please enter a valid git repository URL', (value) => Boolean(collectionRepositoryUrl) || isGitRepositoryUrl(value)),
      collectionLocation: Yup.string().min(1, 'Location is required').required('Location is required')
    }),
    onSubmit: async (values) => {
      onBusyChange(true);
      try {
        setView('progress');
        cloneInProgress();
        const { repositoryUrl, collectionLocation, branch } = values;

        const repoName = getRepoNameFromUrl(repositoryUrl);
        const targetPath = path.join(collectionLocation, repoName);

        await dispatch(
          cloneGitRepository({
            url: repositoryUrl,
            path: targetPath,
            processUid,
            branch: branch || activeBranchListing.defaultBranch
          })
        );

        cloneFinished();
        dispatch(removeGitOperationProgress(processUid));

        await findClonedCollections(targetPath);
      } catch (err) {
        cloneError();
        dispatch(removeGitOperationProgress(processUid));
        console.error(err);
      } finally {
        onBusyChange(false);
      }
    }
  });

  useEffect(() => {
    formik.setFieldValue('collectionLocation', defaultLocation, false);
  }, [defaultLocation]);

  // git logs the URL on failure, so a typed token must not reach the automatic listing
  const canListBranches = (url) => Boolean(collectionRepositoryUrl) || (isGitRepositoryUrl(url) && !hasUrlCredentials(url));
  const activeBranchListing = useBranchListing(formik.values.repositoryUrl, { canList: canListBranches });

  const handleRepositoryUrlChange = (e) => {
    formik.handleChange(e);
    formik.setFieldValue('branch', '');
  };

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

  const isScanCompleted = () => steps.some((step) => step.step === 'scan' && step.completed && !step.error);

  const isConfirmDisabled = () => isScanCompleted() && collectionPaths.length > 0 && selectedCollectionPaths.length === 0;

  const isFooterHidden = () => steps.some((step) => !step.completed);

  const isError = () => steps.some((step) => step.error);

  const handleBackButtonClick = () => {
    setView('form');
    setSteps([]);
    setSelectedCollectionPaths([]);
  };

  const renderFooterLeft = () => {
    if (isError()) {
      return (
        <Button
          type="button"
          variant="ghost"
          color="secondary"
          onClick={handleBackButtonClick}
          data-testid="clone-git-repository-modal-back-btn"
        >
          Back
        </Button>
      );
    }
    if (isScanCompleted() && collectionPaths.length > 0) {
      return (
        <SelectionFooter data-testid="clone-git-selected-count">
          <span>{selectedCollectionPaths.length}</span> of {collectionPaths.length} selected
        </SelectionFooter>
      );
    }
    return null;
  };

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
          if (onOpenCollections) return onOpenCollections(selectedCollectionPaths);
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
      : steps.some((step) => !step.completed || step.error || (isScanCompleted() && !collectionPaths.length))
        ? 'Close'
        : 'Open';

  if (!gitVersion) {
    return <GitNotFoundModal onClose={onClose} />;
  }

  const isInline = variant === 'inline';
  const Outer = isInline ? Fragment : Portal;
  const outerProps = isInline ? {} : { id: 'clone-repository-portal' };
  const Layout = isInline ? InlineLayout : Modal;
  const layoutProps = {
    ...(isInline ? {} : { size: 'md', title: 'Clone Git Repository' }),
    confirmText: getConfirmText(),
    handleConfirm,
    handleCancel: onClose,
    confirmDisabled: isConfirmDisabled(),
    hideFooter: isFooterHidden(),
    hideCancel: isError() || (isScanCompleted() && !collectionPaths.length),
    footerLeft: renderFooterLeft()
  };

  return (
    <Outer {...outerProps}>
      <Layout {...layoutProps}>
        <StyledWrapper className={isInline ? 'clone-inline flex flex-col flex-1 min-h-0' : undefined} data-testid="clone-git-repository-content">
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
                          Repository URL
                        </label>
                        <div className={classnames('mt-2', { 'icon-input-field': isInline })}>
                          {isInline && <IconBrandGit size={15} strokeWidth={1.75} aria-hidden="true" />}
                          <input
                            id="repository-url"
                            type="text"
                            data-testid="clone-git-repository-url"
                            name="repositoryUrl"
                            ref={inputRef}
                            className={classnames({ 'block textbox w-full': !isInline })}
                            placeholder="https://github.com/org/repo"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            onChange={handleRepositoryUrlChange}
                            value={formik.values.repositoryUrl || ''}
                          />
                        </div>
                        <div className="text-muted text-xs mt-1" data-testid="clone-git-repository-url-hint">Any git host: GitHub, GitLab, Bitbucket or self-hosted.</div>
                      </>
                    )}
                {formik.touched.repositoryUrl && formik.errors.repositoryUrl && (
                  <div className="text-red-500" data-testid="clone-git-repository-url-error">{formik.errors.repositoryUrl}</div>
                )}
                <label htmlFor="collection-location" className="block font-semibold mt-3">
                  Clone to location
                </label>
                <div className={classnames('mt-2', { 'icon-input-field no-icon': isInline })}>
                  <input
                    id="collection-location"
                    data-testid="clone-git-repository-location"
                    type="text"
                    name="collectionLocation"
                    readOnly
                    className={classnames('cursor-pointer', { 'block textbox w-full': !isInline })}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={formik.values.collectionLocation || ''}
                    onClick={browse}
                  />
                </div>
                {formik.touched.collectionLocation && formik.errors.collectionLocation && (
                  <div className="text-red-500">{formik.errors.collectionLocation}</div>
                )}
                <div className="mt-1">
                  <span className="text-link cursor-pointer hover:underline" data-testid="clone-git-repository-browse" onClick={browse}>
                    Browse
                  </span>
                </div>
                {isHidden ? null : (
                  <Select
                    className="branch-select mt-5"
                    label="Branch"
                    data={activeBranchListing.branches}
                    value={formik.values.branch || activeBranchListing.defaultBranch}
                    onChange={(branch) => formik.setFieldValue('branch', branch || '')}
                    searchable
                    appendTo={isInline ? () => document.body : undefined}
                    fitToSpace={isInline}
                    allowDeselect={false}
                    loading={activeBranchListing.loading}
                    rightSection={activeBranchListing.loading ? undefined : <IconChevronDown size={12} strokeWidth={2} />}
                    disabled={!activeBranchListing.branches.length}
                    placeholder={activeBranchListing.loading ? 'Loading branches...' : 'Repository default'}
                    nothingFoundMessage="No branches match your search"
                    data-testid="clone-git-repository-branch-select"
                  />
                )}
                {activeBranchListing.failed && (
                  <div className="text-muted text-xs mt-1">
                    Branches could not be listed for this repository. Cloning will use the default branch.
                  </div>
                )}
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
                <div className={classnames('w-full min-w-0 flex flex-col gap-3', { 'flex-1 min-h-0': isInline })} data-testid="clone-git-scan-result">
                  {collectionPaths.length === 0 && (
                    <div className="scan-warning flex items-start gap-2">
                      <IconAlertCircle className="scan-warning-icon" size={18} strokeWidth={1.5} />
                      <div>No Bruno collections were found in this repository.</div>
                    </div>
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
                      fillHeight={isInline}
                    />
                  )}
                  <SkippedPathsWarning paths={skippedCollectionPaths} itemNoun="collections" />
                </div>
              )}
            </>
          )}
        </StyledWrapper>
      </Layout>
    </Outer>
  );
};

export default CloneGitRepository;
