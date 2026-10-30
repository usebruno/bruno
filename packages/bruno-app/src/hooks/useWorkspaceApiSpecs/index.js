import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { matchLoadedApiSpecs } from 'utils/api-specs/matchLoadedApiSpecs';

const useWorkspaceApiSpecs = () => {
  const apiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const activeWorkspace = useSelector((state) => (
    state.workspaces.workspaces.find((workspace) => workspace.uid === state.workspaces.activeWorkspaceUid)
  ));

  return useMemo(() => (
    activeWorkspace ? matchLoadedApiSpecs(activeWorkspace.apiSpecs, apiSpecs) : []
  ), [activeWorkspace, apiSpecs]);
};

export default useWorkspaceApiSpecs;
