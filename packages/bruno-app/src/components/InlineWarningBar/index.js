import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { IconAlertTriangle, IconX } from '@tabler/icons';
import { dismissItemWarnings } from 'providers/ReduxStore/slices/collections';
import { getActiveWarningsForLocation } from 'utils/warnings';
import StyledWrapper from './StyledWrapper';

const MAX_APIS = 3;

const extractApiName = (message) => {
  const lastColon = message.lastIndexOf(': ');
  return lastColon !== -1 ? message.slice(lastColon + 2) : message;
};

const InlineWarningBar = ({ item, collectionUid, location }) => {
  const dispatch = useDispatch();

  const warnings = useMemo(
    () => getActiveWarningsForLocation(item, location),
    [item.warnings, item.dismissedWarningRules, location]
  );

  if (warnings.length === 0) return null;

  const apis = warnings.map((w) => extractApiName(w.message));
  const displayed = apis.slice(0, MAX_APIS);
  const remaining = apis.length - MAX_APIS;

  const summary = remaining > 0
    ? `${displayed.join(', ')} and ${remaining} more`
    : displayed.join(', ');

  const handleDismiss = () => {
    dispatch(dismissItemWarnings({ collectionUid, itemUid: item.uid, location }));
  };

  return (
    <StyledWrapper>
      <div className="inline-warning-bar">
        <div className="inline-warning-content">
          <IconAlertTriangle size={14} className="inline-warning-icon" />
          <span className="inline-warning-text">
            {warnings.length} untranslated Postman API{warnings.length > 1 ? 's' : ''}: {summary}
          </span>
        </div>
        <button onClick={handleDismiss} className="inline-warning-dismiss" title="Dismiss warnings">
          <IconX size={14} />
        </button>
      </div>
    </StyledWrapper>
  );
};

export default InlineWarningBar;
