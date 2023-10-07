import React from 'react';
import get from 'lodash/get';
import AuthMode from './AuthMode';
import BearerAuth from './BearerAuth';
import BasicAuth from './BasicAuth';
import StyledWrapper from './StyledWrapper';

const Auth = ({ item, collection }) => {
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const getAuthView = () => {
    switch (authMode) {
      case 'basic': {
        return <BasicAuth collection={collection} item={item} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} item={item} />;
      }
    }
  };

  return (
    <StyledWrapper className="w-full mt-1">
      <div className="flex flex-grow justify-start items-center">
        <AuthMode item={item} collection={collection} />
      </div>
      {getAuthView()}
    </StyledWrapper>
  );
};
export default Auth;
