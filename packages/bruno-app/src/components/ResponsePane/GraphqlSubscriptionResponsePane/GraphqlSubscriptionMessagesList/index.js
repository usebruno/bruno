import React from 'react';
import SocketMessagesList from '../../SocketMessagesList';

const GraphqlSubscriptionMessagesList = ({ messages = [] }) => (
  <SocketMessagesList messages={messages} classPrefix="gql-subscription" />
);

export default GraphqlSubscriptionMessagesList;
