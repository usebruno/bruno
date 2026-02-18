import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { IconLoader2 } from '@tabler/icons';
import {
  getFileContentForVisualDiff,
  getStashFileContentForVisualDiff,
  getWorkingFileContentForVisualDiff
} from 'providers/ReduxStore/slices/git/actions';
import VisualDiffMeta from './VisualDiffMeta';
import VisualDiffUrlBar from './VisualDiffUrlBar';
import VisualDiffParams from './VisualDiffParams';
import VisualDiffHeaders from './VisualDiffHeaders';
import VisualDiffAuth from './VisualDiffAuth';
import VisualDiffBody from './VisualDiffBody';
import VisualDiffVars from './VisualDiffVars';
import VisualDiffAssertions from './VisualDiffAssertions';
import VisualDiffScript from './VisualDiffScript';
import VisualDiffSettings from './VisualDiffSettings';
import VisualDiffDocs from './VisualDiffDocs';
import VisualDiffExamples from './VisualDiffExamples';
import CollapsibleDiffRow from './CollapsibleDiffRow';
import VisualDiffContent from './VisualDiffContent';
import StyledWrapper from './StyledWrapper';

// Section configurations for full Git diff (all Bruno request sections)
const getGitDiffSections = () => {
  const hasContent = {
    meta: (data) => data?.name || data?.type || data?.seq || (data?.tags && data.tags.length > 0),
    url: (data) => data?.request?.url || data?.request?.method,
    params: (data) => data?.request?.params && data.request.params.length > 0,
    headers: (data) => data?.request?.headers && data.request.headers.length > 0,
    auth: (data) => data?.request?.auth && Object.keys(data.request.auth).length > 0,
    body: (data) => data?.request?.body && Object.keys(data.request.body).length > 0,
    vars: (data) => data?.request?.vars && (data.request.vars.req?.length > 0 || data.request.vars.res?.length > 0),
    assertions: (data) => data?.request?.assertions && data.request.assertions.length > 0,
    script: (data) => data?.request?.script?.req || data?.request?.script?.res || data?.request?.tests,
    settings: (data) => data?.settings && Object.keys(data.settings).length > 0,
    docs: (data) => data?.request?.docs,
    examples: (data) => data?.examples && data.examples.length > 0
  };

  return [
    { key: 'meta', title: 'Info', Component: VisualDiffMeta, hasContent: hasContent.meta },
    { key: 'url', title: 'URL', Component: VisualDiffUrlBar, hasContent: hasContent.url },
    { key: 'params', title: 'Parameters', Component: VisualDiffParams, hasContent: hasContent.params },
    { key: 'headers', title: 'Headers', Component: VisualDiffHeaders, hasContent: hasContent.headers },
    { key: 'auth', title: 'Authentication', Component: VisualDiffAuth, hasContent: hasContent.auth },
    { key: 'body', title: 'Body', Component: VisualDiffBody, hasContent: hasContent.body },
    { key: 'vars', title: 'Variables', Component: VisualDiffVars, hasContent: hasContent.vars },
    { key: 'assertions', title: 'Assertions', Component: VisualDiffAssertions, hasContent: hasContent.assertions },
    { key: 'script', title: 'Scripts & Tests', Component: VisualDiffScript, hasContent: hasContent.script },
    { key: 'settings', title: 'Settings', Component: VisualDiffSettings, hasContent: hasContent.settings },
    { key: 'docs', title: 'Documentation', Component: VisualDiffDocs, hasContent: hasContent.docs },
    { key: 'examples', title: 'Examples', Component: VisualDiffExamples, hasContent: hasContent.examples }
  ];
};

// Section configurations for OpenAPI sync diff (HTTP request sections only)
// Data format matches Git diff format: data.request.url, data.request.params, etc.
const getOpenAPIDiffSections = () => {
  const hasContent = {
    url: (data) => data?.request?.url || data?.request?.method,
    params: (data) => data?.request?.params && data.request.params.length > 0,
    headers: (data) => data?.request?.headers && data.request.headers.length > 0,
    auth: (data) => data?.request?.auth && data.request.auth.mode && data.request.auth.mode !== 'none',
    body: (data) => {
      if (!data?.request?.body) return false;
      const mode = data.request.body.mode;
      if (!mode || mode === 'none') return false;
      return data.request.body.json || data.request.body.text || data.request.body.xml
        || data.request.body.graphql || data.request.body.formUrlEncoded?.length > 0
        || data.request.body.multipartForm?.length > 0;
    }
  };

  return [
    { key: 'url', title: 'URL', Component: VisualDiffUrlBar, hasContent: hasContent.url },
    { key: 'params', title: 'Parameters', Component: VisualDiffParams, hasContent: hasContent.params },
    { key: 'headers', title: 'Headers', Component: VisualDiffHeaders, hasContent: hasContent.headers },
    { key: 'auth', title: 'Authentication', Component: VisualDiffAuth, hasContent: hasContent.auth },
    { key: 'body', title: 'Body', Component: VisualDiffBody, hasContent: hasContent.body }
  ];
};

const VisualDiffViewer = ({
  gitRootPath,
  filePath,
  fileStatus,
  source = 'commit',
  commitHash,
  stashIndex,
  workingType,
  isUntracked = false
}) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [oldData, setOldData] = useState(null);
  const [newData, setNewData] = useState(null);
  const [error, setError] = useState(null);

  const supportsVisualDiff = useMemo(() => {
    if (!filePath) return false;
    const fileName = filePath.split('/').pop();
    const excludedFiles = ['folder.yml', 'folder.bru', 'collection.bru', 'opencollection.yml'];
    if (excludedFiles.includes(fileName)) return false;
    return filePath.endsWith('.bru') || filePath.endsWith('.yml');
  }, [filePath]);

  const loadContent = useCallback(async () => {
    if (!gitRootPath || !filePath || !supportsVisualDiff) {
      setIsLoading(false);
      return;
    }

    if (source === 'commit' && !commitHash) {
      setIsLoading(false);
      return;
    }
    if (source === 'stash' && stashIndex === undefined) {
      setIsLoading(false);
      return;
    }
    if (source === 'working' && !workingType) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let result;

      if (source === 'commit') {
        result = await dispatch(
          getFileContentForVisualDiff({ gitRootPath, commitHash, filePath })
        );
      } else if (source === 'stash') {
        result = await dispatch(
          getStashFileContentForVisualDiff({ gitRootPath, stashIndex, filePath, isUntracked })
        );
      } else if (source === 'working') {
        result = await dispatch(
          getWorkingFileContentForVisualDiff({ gitRootPath, filePath, type: workingType })
        );
      }

      if (result) {
        setOldData(result.oldParsed);
        setNewData(result.newParsed);
      }
    } catch (err) {
      console.error('Error loading visual diff content:', err);
      setError(err?.message || 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, gitRootPath, filePath, supportsVisualDiff, source, commitHash, stashIndex, workingType, isUntracked]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const sections = useMemo(() => getGitDiffSections(), []);

  if (!supportsVisualDiff) {
    return (
      <StyledWrapper>
        <div className="not-bru-file">
          <div>Visual diff is only available for .bru and .yml request files</div>
          <div className="mt-1 text-xs">Use the text diff view for this file type</div>
        </div>
      </StyledWrapper>
    );
  }

  if (isLoading) {
    return (
      <StyledWrapper>
        <div className="loading-state">
          <IconLoader2 size={14} strokeWidth={2} className="animate-spin" />
          <span>Loading visual diff...</span>
        </div>
      </StyledWrapper>
    );
  }

  if (error) {
    return (
      <StyledWrapper>
        <div className="empty-state">
          Error: {error}
        </div>
      </StyledWrapper>
    );
  }

  const oldLabel = `Before ${fileStatus === 'added' ? '(File did not exist)' : ''}`;
  const newLabel = `After ${fileStatus === 'deleted' ? '(File was deleted)' : ''}`;

  return (
    <VisualDiffContent
      oldData={oldData}
      newData={newData}
      sections={sections}
      oldLabel={oldLabel}
      newLabel={newLabel}
    />
  );
};

export default VisualDiffViewer;
export { CollapsibleDiffRow, VisualDiffContent, getGitDiffSections, getOpenAPIDiffSections };
