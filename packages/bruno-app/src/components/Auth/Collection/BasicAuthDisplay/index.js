import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';

const BasicAuth = ({ collection }) => {
  const { storedTheme } = useTheme();
  const basicAuth = get(collection, 'root.request.auth.basic', {});

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Username</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor value={basicAuth.username || ''} theme={storedTheme} collection={collection} />
      </div>

      <label className="block font-medium mb-2">Password</label>
      <div className="single-line-editor-wrapper">
        <SingleLineEditor value={basicAuth.password || ''} theme={storedTheme} collection={collection} />
      </div>
    </StyledWrapper>
  );
};

export default BasicAuth;
