import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import SingleLineDisplay from 'components/SingleLineDisplay';
import StyledWrapper from './StyledWrapper';

const DigestAuth = ({ collection }) => {
  const { storedTheme } = useTheme();
  const digestAuth = get(collection, 'root.request.auth.digest', {});

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Username</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineDisplay value={digestAuth.username || ''} theme={storedTheme} collection={collection} />
      </div>

      <label className="block font-medium mb-2">Password</label>
      <div className="single-line-editor-wrapper">
        <SingleLineDisplay value={digestAuth.password || ''} theme={storedTheme} collection={collection} />
      </div>
    </StyledWrapper>
  );
};

export default DigestAuth;
