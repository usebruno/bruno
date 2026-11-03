import React from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { openApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import ApiSpecItem from './ApiSpecItem';
import StyledWrapper from './StyledWrapper';
import { matchLoadedApiSpecs } from './matchLoadedApiSpecs';
import toast from 'react-hot-toast';

const LinkStyle = styled.span`
  color: ${(props) => props.theme['text-link']};
`;

const ApiSpecs = () => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const allApiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);

  const apiSpecs = React.useMemo(() => {
    if (!activeWorkspace) return [];

    const workspaceApiSpecs = Array.isArray(activeWorkspace.apiSpecs) ? activeWorkspace.apiSpecs : [];

    // Pair workspace API specs to loaded specs in redux, matching by normalized
    // path so Windows (backslash) and stored (forward-slash) paths line up.
    return matchLoadedApiSpecs(workspaceApiSpecs, allApiSpecs);
  }, [allApiSpecs, activeWorkspace, activeWorkspace?.apiSpecs]);

  const handleOpenApiSpec = () => {
    dispatch(openApiSpec()).catch(
      (err) => console.log(err) && toast.error('An error occurred while opening the API spec')
    );
  };

  const OpenLink = () => (
    <LinkStyle className="underline text-link cursor-pointer" theme={theme} onClick={() => handleOpenApiSpec()}>
      Open
    </LinkStyle>
  );

  if (!apiSpecs || !apiSpecs.length) {
    return (
      <StyledWrapper>
        <div className="text-xs text-center placeholder py-4">
          <div>No API Specs found.</div>
          <div className="mt-2">
            <OpenLink /> API Spec.
          </div>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="api-specs-list">
        {apiSpecs && apiSpecs.length
          ? apiSpecs.map((apiSpec) => {
              return <ApiSpecItem apiSpec={apiSpec} key={apiSpec.uid} />;
            })
          : null}
      </div>
    </StyledWrapper>
  );
};

export default ApiSpecs;
