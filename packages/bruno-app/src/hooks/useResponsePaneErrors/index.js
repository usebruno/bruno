import { useState } from 'react';
import { usePersistedState } from 'hooks/usePersistedState';
import { getResponsePaneErrors } from 'utils/response-pane-errors';

const useResponsePaneErrors = (item, collection, { isResponseTabActive, showResponseTab }) => {
  const errors = getResponsePaneErrors(item, collection);

  const [closedRun, setClosedRun] = usePersistedState({ key: `response-pane-errors-closed-${item.uid}`, default: null });
  const [fullPaneRun, setFullPaneRun] = useState(null);

  // The send timestamp still tells cancelled runs apart when requestUid gets nulled
  const runUid = item.requestUid ?? item.requestSent?.timestamp;
  const isCurrentRun = (run) => Boolean(run) && run.requestUid === runUid;
  const hasErrors = errors.length > 0;

  const isCardRemoved = hasErrors && (!isResponseTabActive || isCurrentRun(closedRun));
  const isCardFullPane = hasErrors && !isCardRemoved && isCurrentRun(fullPaneRun);

  const closeCard = () => {
    setClosedRun({ requestUid: runUid });
    setFullPaneRun(null);
  };

  const reopenCard = () => {
    showResponseTab();
    setClosedRun(null);
  };

  const toggleCardFullPane = () => setFullPaneRun(isCardFullPane ? null : { requestUid: runUid });

  return { errors, isCardRemoved, closeCard, reopenCard, isCardFullPane, toggleCardFullPane };
};

export default useResponsePaneErrors;
