import React from 'react';
import get from 'lodash/get';
import AuthMode from './AuthMode';
import AwsV4Auth from './AwsV4Auth';
import BearerAuth from './BearerAuth';
import BasicAuth from './BasicAuth';
import StyledWrapper from './StyledWrapper';
import PaneContent from '../PaneContent/index';

const Auth = ({ item, collection }) => {
  const authMode = item.draft ? get(item, 'draft.request.auth.mode') : get(item, 'request.auth.mode');

  const getAuthView = () => {
    switch (authMode) {
      case 'awsv4': {
        return <AwsV4Auth collection={collection} item={item} />;
      }
      case 'basic': {
        return <BasicAuth collection={collection} item={item} />;
      }
      case 'bearer': {
        return <BearerAuth collection={collection} item={item} />;
      }
    }
  };

  return <PaneContent head={<AuthMode item={item} collection={collection} />}>{getAuthView()}</PaneContent>;
};
export default Auth;
