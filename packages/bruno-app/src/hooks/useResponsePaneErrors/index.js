import { useState } from 'react';
import { usePersistedState } from 'hooks/usePersistedState';
import { getResponsePaneErrors } from 'utils/response-pane-errors';

const useResponsePaneErrors = (item, collection, { isResponseTabActive, showResponseTab }) => {
  const errors = getResponsePaneErrors(item, collection);

  const [closed, setClosed] = usePersistedState({ key: `response-pane-errors-closed-${item.uid}`, default: null });
  const [fullPane, setFullPane] = useState(null);

  // A cancelled send loses its requestUid, but its send timestamp is still available
  const sendId = item.requestUid ?? item.requestSent?.timestamp;
  const isCurrentSend = (send) => Boolean(send) && Boolean(sendId) && send.sendId === sendId;
  const hasErrors = errors.length > 0;

  const isCardClosed = hasErrors && (!isResponseTabActive || isCurrentSend(closed));
  const isCardFullPane = hasErrors && !isCardClosed && isCurrentSend(fullPane);

  const closeCard = () => {
    setClosed({ sendId });
    setFullPane(null);
  };

  const reopenCard = () => {
    showResponseTab();
    setClosed(null);
  };

  const toggleCardFullPane = () => setFullPane(isCardFullPane ? null : { sendId });

  return { errors, isCardClosed, closeCard, reopenCard, isCardFullPane, toggleCardFullPane };
};

export default useResponsePaneErrors;
