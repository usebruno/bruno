import React from 'react';
import SocketResponsePane from '../SocketResponsePane';
import GraphqlSubscriptionMessagesList from './GraphqlSubscriptionMessagesList';

const GraphqlSubscriptionResponsePane = ({ item, collection }) => (
  <SocketResponsePane item={item} collection={collection} MessagesList={GraphqlSubscriptionMessagesList} />
);

export default GraphqlSubscriptionResponsePane;
