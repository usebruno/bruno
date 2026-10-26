import React from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { openApiSpec } from 'providers/ReduxStore/slices/apiSpec';
import ApiSpecItem from './ApiSpecItem';
import StyledWrapper from './StyledWrapper';
import useWorkspaceApiSpecs from 'hooks/useWorkspaceApiSpecs';
import toast from 'react-hot-toast';

const LinkStyle = styled.span`
  color: ${(props) => props.theme['text-link']};
`;

const ApiSpecs = () => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const apiSpecs = useWorkspaceApiSpecs();

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
