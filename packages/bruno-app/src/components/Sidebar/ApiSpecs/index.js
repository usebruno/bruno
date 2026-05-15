import React from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { openApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import ApiSpecItem from './ApiSpecItem';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const LinkStyle = styled.span`
  color: ${(props) => props.theme['text-link']};
`;

const ApiSpecs = () => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { t } = useTranslation();
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
      (err) => console.log(err) && toast.error(t('SIDEBAR.API_SPECS_OPEN_ERROR'))
    );
  };

  const OpenLink = () => (
    <LinkStyle className="underline text-link cursor-pointer" theme={theme} onClick={() => handleOpenApiSpec()}>
      {t('SIDEBAR.API_SPECS_OPEN')}
    </LinkStyle>
  );

  if (!apiSpecs || !apiSpecs.length) {
    return (
      <StyledWrapper>
        <div className="text-xs text-center placeholder py-4">
          <div>{t('SIDEBAR.API_SPECS_NONE_FOUND')}</div>
          <div className="mt-2">
            <OpenLink /> {t('SIDEBAR.API_SPECS_API_SPEC')}
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
