import { useSyncExternalStore } from 'react';
import { getScheduledSend, subscribeScheduledSends } from 'providers/ReduxStore/slices/collections/scheduled-send';

const useScheduledSend = (itemUid) => {
  return useSyncExternalStore(subscribeScheduledSends, () => getScheduledSend(itemUid));
};

export default useScheduledSend;
