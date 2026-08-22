import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SaveRequestsModal from './SaveRequestsModal';
import OnExitModal from './OnExitModal';
import { isElectron } from 'utils/common/platform';
import { completeQuitFlow } from 'providers/ReduxStore/slices/app';
import { cancelRequestByItemUid, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { buildCleanupPlans } from './cleanup-plans';
import { executeCleanupPlans } from './cleanup-runner';

const ConfirmAppClose = () => {
  const { ipcRenderer } = window;
  const [stage, setStage] = useState(null);
  const [cleanupStatus, setCleanupStatus] = useState('idle');
  const [cleanupError, setCleanupError] = useState(null);
  const [currentCleanupRequest, setCurrentCleanupRequest] = useState(null);
  const collections = useSelector((state) => state.collections.collections);
  const dispatch = useDispatch();
  const cleanupRunRef = useRef(false);
  const cleanupAttemptRef = useRef(0);
  const activeCleanupRequestRef = useRef(null);

  const cleanupPlans = useMemo(() => buildCleanupPlans(collections), [collections]);
  const shouldConfirmCleanup = cleanupPlans.some((plan) => plan.showReminder);

  const quit = useCallback(() => {
    setStage('quitting');
    dispatch(completeQuitFlow());
  }, [dispatch]);

  const runCleanup = useCallback(async () => {
    if (cleanupRunRef.current) return;
    const attempt = ++cleanupAttemptRef.current;
    cleanupRunRef.current = true;
    setCleanupStatus('running');
    setCleanupError(null);

    try {
      await executeCleanupPlans({
        plans: cleanupPlans,
        runRequest: (request, plan) => dispatch(sendRequest(request, plan.collectionUid, { rejectOnError: true })),
        cancelRequest: (request, plan) => dispatch(cancelRequestByItemUid(request.uid, plan.collectionUid)),
        onRequestStart: ({ plan, request, requestName }) => {
          activeCleanupRequestRef.current = { itemUid: request.uid, collectionUid: plan.collectionUid };
          setCurrentCleanupRequest(requestName);
        }
      });
      if (attempt !== cleanupAttemptRef.current) return;
      setCleanupStatus('complete');
      setCurrentCleanupRequest(null);
      activeCleanupRequestRef.current = null;
      quit();
    } catch (error) {
      if (attempt !== cleanupAttemptRef.current) return;
      setCleanupStatus('error');
      setCleanupError(error?.message || 'An on-exit cleanup request failed.');
      setCurrentCleanupRequest(null);
      activeCleanupRequestRef.current = null;
      cleanupRunRef.current = false;
    }
  }, [cleanupPlans, dispatch, quit]);

  const stopActiveCleanup = useCallback(() => {
    cleanupAttemptRef.current += 1;
    cleanupRunRef.current = false;
    const activeRequest = activeCleanupRequestRef.current;
    activeCleanupRequestRef.current = null;
    if (activeRequest) {
      Promise.resolve(dispatch(cancelRequestByItemUid(activeRequest.itemUid, activeRequest.collectionUid)))
        .catch(() => undefined);
    }
  }, [dispatch]);

  const cancelCleanup = useCallback(() => {
    stopActiveCleanup();
    setCurrentCleanupRequest(null);
    setCleanupStatus('idle');
    setCleanupError(null);
    setStage(null);
  }, [stopActiveCleanup]);

  const quitWithoutCleanup = useCallback(() => {
    stopActiveCleanup();
    quit();
  }, [quit, stopActiveCleanup]);

  const afterDrafts = useCallback(() => {
    cleanupRunRef.current = false;
    setCleanupStatus('idle');
    setCleanupError(null);
    setCurrentCleanupRequest(null);
    setStage('cleanup');
  }, []);

  useEffect(() => {
    if (!isElectron()) return;

    const clearListener = ipcRenderer.on('main:start-quit-flow', () => {
      setStage((currentStage) => currentStage || 'drafts');
    });

    return () => clearListener();
  }, [ipcRenderer]);

  useEffect(() => {
    if (stage !== 'cleanup' || cleanupStatus !== 'idle') return;
    if (!cleanupPlans.length) {
      quit();
    } else if (!shouldConfirmCleanup) {
      runCleanup();
    }
  }, [stage, cleanupStatus, cleanupPlans.length, shouldConfirmCleanup, quit, runCleanup]);

  if (!stage || stage === 'quitting') return null;

  if (stage === 'drafts') {
    return <SaveRequestsModal onClose={() => setStage(null)} onComplete={afterDrafts} />;
  }

  return (
    <OnExitModal
      plans={cleanupPlans}
      status={cleanupStatus}
      error={cleanupError}
      currentRequest={currentCleanupRequest}
      onCancel={() => setStage(null)}
      onCancelRun={cancelCleanup}
      onRun={runCleanup}
      onSkip={quitWithoutCleanup}
    />
  );
};

export default ConfirmAppClose;
