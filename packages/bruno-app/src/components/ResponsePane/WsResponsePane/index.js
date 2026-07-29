import React from 'react';
import SocketResponsePane from '../SocketResponsePane';
import WSMessagesList from './WSMessagesList';

const WSResponsePane = ({ item, collection }) => (
  <SocketResponsePane item={item} collection={collection} MessagesList={WSMessagesList} />
);

export default WSResponsePane;
