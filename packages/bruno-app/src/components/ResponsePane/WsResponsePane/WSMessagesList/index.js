import React from 'react';
import SocketMessagesList from '../../SocketMessagesList';

const WSMessagesList = ({ messages = [] }) => (
  <SocketMessagesList messages={messages} classPrefix="ws" supportsHexdump />
);

export default WSMessagesList;
