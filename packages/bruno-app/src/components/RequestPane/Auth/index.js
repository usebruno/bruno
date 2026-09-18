import React, { useMemo } from 'react';
import get from 'lodash/get';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import AuthMode from './AuthMode';
import StyledWrapper from './StyledWrapper';
import { getEffectiveAuthSource } from 'utils/auth';
import AuthFields from './AuthFields';
import InheritedAuth, { InheritedAuthSourceLabel } from './InheritedAuth';

const Auth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const request = item.draft
    ? get(item, 'draft.request', {})
    : get(item, 'request', {});

  const save = () => {
    return dispatch(saveRequest(item.uid, collection.uid));
  };

  const inheritedSource = useMemo(
    () => (authMode === 'inherit' ? getEffectiveAuthSource(collection, item) : null),
    [authMode, item, collection]
  );

  const getAuthView = () => {
    if (authMode === 'inherit') {
      return <InheritedAuth collection={collection} item={item} inheritedSource={inheritedSource} />;
    }

    return (
      <AuthFields
        authMode={authMode}
        collection={collection}
        item={item}
        request={request}
        save={save}
        updateAuth={updateAuth}
      />
    );
  };

  return (
    <StyledWrapper className="w-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <AuthMode item={item} collection={collection} />
        {authMode === 'inherit' && inheritedSource ? (
          <InheritedAuthSourceLabel collection={collection} inheritedSource={inheritedSource} />
        ) : null}
      </div>
      {getAuthView()}
    </StyledWrapper>
  );
};

export default Auth;
