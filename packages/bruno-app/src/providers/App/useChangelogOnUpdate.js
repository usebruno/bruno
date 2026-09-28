import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import semver from 'semver';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { version as currentVersion } from '../../../package.json';

const useChangelogOnUpdate = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const snapshotReady = useSelector((state) => state.app.snapshotReady);
  const activeWorkspace = useSelector((state) => {
    const { workspaces, activeWorkspaceUid } = state.workspaces;
    return workspaces.find((w) => w.uid === activeWorkspaceUid);
  });
  const activeTabCollectionUid = useSelector((state) => {
    const activeTab = state.tabs.tabs.find((t) => t.uid === state.tabs.activeTabUid);
    return activeTab?.collectionUid;
  });
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;

    // hasLaunchedBefore is set by electron-side onboarding before the renderer
    // receives preferences via main:load-preferences. Until that flips true,
    // we're still on the renderer's default state and shouldn't act yet.
    const hasLaunchedBefore = preferences?.onboarding?.hasLaunchedBefore;
    if (!hasLaunchedBefore) return;

    // Wait until snapshot hydration finishes, otherwise the workspace's
    // overview/restored tabs are added after ours and steal active focus.
    if (!snapshotReady) return;

    // Need a collection context to dock the tab onto an existing tab strip.
    const collectionUid = activeTabCollectionUid || activeWorkspace?.scratchCollectionUid;
    if (!collectionUid) return;

    hasRunRef.current = true;

    const onboarding = preferences.onboarding || {};
    const { lastSeenVersion } = onboarding;
    if (lastSeenVersion && semver.valid(lastSeenVersion) && semver.gte(lastSeenVersion, currentVersion)) return;

    dispatch(addTab({
      type: 'changelog',
      uid: `${collectionUid}-changelog`,
      collectionUid
    }));

    dispatch(savePreferences({
      ...preferences,
      onboarding: { ...onboarding, lastSeenVersion: currentVersion }
    })).catch(() => {});
  }, [preferences, snapshotReady, activeWorkspace, activeTabCollectionUid, dispatch]);
};

export default useChangelogOnUpdate;
