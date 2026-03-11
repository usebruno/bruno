import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconAlertTriangle, IconX } from '@tabler/icons';
import { dismissItemWarnings } from 'providers/ReduxStore/slices/collections';
import { getActiveWarningsForLocation } from 'utils/warnings';
import StyledWrapper from './StyledWrapper';

const MAX_VISIBLE_APIS = 3;

const extractApiName = (message) => {
  const lastColon = message.lastIndexOf(': ');
  return lastColon !== -1 ? message.slice(lastColon + 2) : message;
};

const InlineWarningBar = ({ item, collectionUid, location }) => {
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(false);

  const warnings = useMemo(
    () => getActiveWarningsForLocation(item, location),
    [item.warnings, item.dismissedWarningRules, location]
  );

  const allApiNames = useMemo(
    () => warnings.map((w) => extractApiName(w.message)),
    [warnings]
  );

  if (warnings.length === 0) return null;

  const handleDismiss = () => {
    dispatch(dismissItemWarnings({ collectionUid, itemUid: item.uid, location }));
  };

  const shouldTruncate = allApiNames.length > MAX_VISIBLE_APIS;
  const visibleNames = shouldTruncate && !expanded
    ? allApiNames.slice(0, MAX_VISIBLE_APIS)
    : allApiNames;
  const remaining = allApiNames.length - MAX_VISIBLE_APIS;

  const prefix = warnings.length === 1
    ? 'Unsupported Postman API found: '
    : `${warnings.length} unsupported Postman APIs found: `;

  return (
    <StyledWrapper>
      <div className="inline-warning-bar">
        <IconAlertTriangle size={14} className="inline-warning-icon" />
        <span className="inline-warning-title">
          {prefix}{visibleNames.join(', ')}
          {shouldTruncate && (
            <button
              className="inline-warning-toggle"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : `+${remaining} more`}
            </button>
          )}
        </span>
        <button onClick={handleDismiss} className="inline-warning-dismiss" title="Dismiss warnings">
          <IconX size={14} />
        </button>
      </div>
    </StyledWrapper>
  );
};

export default InlineWarningBar;
