export const eventTypes = {
  OPEN_REQUEST: 'OPEN_REQUEST',
  CLOSE_REQUEST: 'CLOSE_REQUEST',
  CLOSE_APP: 'CLOSE_APP'
};

export const eventMatchesItem = (event, item) => {
  return event.itemUid === item.uid || event.itemPathname === item.pathname;
};
