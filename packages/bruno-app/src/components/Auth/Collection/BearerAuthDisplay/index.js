import React from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import SingleLineDisplay from 'components/SingleLineDisplay';
import StyledWrapper from './StyledWrapper';

const BearerAuth = ({ collection }) => {
  const { storedTheme } = useTheme();
  const bearerToken = get(collection, 'root.request.auth.bearer.token');

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block font-medium mb-2">Token</label>
      <div className="single-line-editor-wrapper">
        <SingleLineDisplay value={bearerToken} theme={storedTheme} collection={collection} />
      </div>
    </StyledWrapper>
  );
};

export default BearerAuth;
