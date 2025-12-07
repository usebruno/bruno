import React from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { openApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import ApiSpecItem from './ApiSpecItem';
import ApiSpecsBadge from './ApiSpecBadge';
import StyledWrapper from './StyledWrapper';
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

    const workspaceApiSpecs = activeWorkspace.apiSpecs || [];

    // Map workspace API specs to loaded API specs from Redux store
    return workspaceApiSpecs.map((ws) => {
      const loadedApiSpec = allApiSpecs.find((apiSpec) => apiSpec.pathname === ws.path);
      return loadedApiSpec;
    }).filter(Boolean);
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
        <ApiSpecsBadge />
        <div className="text-xs text-center placeholder mt-4">
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
      <div className="relative">
        <ApiSpecsBadge />
        <div className="flex flex-col top-32 bottom-10 left-0 right-0 py-4">
          {apiSpecs && apiSpecs.length
            ? apiSpecs.map((apiSpec) => {
                return <ApiSpecItem apiSpec={apiSpec} key={apiSpec.uid} />;
              })
            : null}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ApiSpecs;
