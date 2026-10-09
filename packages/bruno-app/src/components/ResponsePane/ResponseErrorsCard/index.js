import React, { useId } from 'react';
import classnames from 'classnames';
import {
  IconAlertCircle,
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
  IconArrowsMoveVertical,
  IconFold,
  IconX
} from '@tabler/icons';

import ToolHint from 'components/ToolHint';
import useExpandedRows from 'hooks/useExpandedRows';
import CardActionIcon from './CardActionIcon';
import CopyErrorButton from './CopyErrorButton';
import ErrorRow from './ErrorRow';
import ErrorDetails from './ErrorDetails';
import StyledWrapper from './StyledWrapper';

const ResponseErrorsCard = ({ errors, item, collection, isCardFullPane, onToggleCardFullPane, onClose }) => {
  const { isRowExpanded, areAllRowsExpanded, toggleRow, toggleAllRows } = useExpandedRows(errors.map((error) => error.scriptType));
  const tooltipId = `response-errors-card-${useId().replace(/:/g, '')}`;

  const isSingle = errors.length === 1;
  const title = isSingle ? errors[0].title : `${errors.length} errors`;

  const toggleAllLabel = areAllRowsExpanded ? 'Collapse all' : 'Expand all';
  const cardFullPaneLabel = isCardFullPane ? 'Restore height' : 'Expand to full pane';

  const body = isSingle ? (
    <ErrorDetails error={errors[0]} item={item} collection={collection} />
  ) : (
    errors.map((error) => (
      <ErrorRow
        key={error.scriptType}
        error={error}
        item={item}
        collection={collection}
        isExpanded={isRowExpanded(error.scriptType)}
        onToggleExpanded={() => toggleRow(error.scriptType)}
        tooltipId={tooltipId}
      />
    ))
  );

  return (
    <StyledWrapper className={classnames({ 'full-pane': isCardFullPane })} role="region" aria-label={title} data-testid="response-errors-card">
      <div className="card-header">
        <IconAlertCircle className="card-title-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="card-title" data-testid="response-errors-title">{title}</span>
        <div className="card-actions">
          {isSingle ? (
            <CopyErrorButton error={errors[0]} tooltipId={tooltipId} />
          ) : (
            <CardActionIcon label={toggleAllLabel} tooltipId={tooltipId} data-testid="response-errors-toggle-all" onClick={toggleAllRows}>
              {areAllRowsExpanded ? <IconFold size={16} strokeWidth={1.5} /> : <IconArrowsMoveVertical size={16} strokeWidth={1.5} />}
            </CardActionIcon>
          )}
          <CardActionIcon label={cardFullPaneLabel} tooltipId={tooltipId} data-testid="response-errors-full-pane-toggle" onClick={onToggleCardFullPane} aria-pressed={isCardFullPane}>
            {isCardFullPane ? <IconArrowsDiagonalMinimize2 size={16} strokeWidth={1.5} /> : <IconArrowsDiagonal size={16} strokeWidth={1.5} />}
          </CardActionIcon>
          <CardActionIcon label="Close" tooltipId={tooltipId} data-testid="response-errors-close" onClick={onClose}>
            <IconX size={16} strokeWidth={1.5} />
          </CardActionIcon>
        </div>
      </div>
      <div className="card-body scrollbar-hover" data-testid="response-errors-body">
        {body}
      </div>
      <ToolHint tooltipId={tooltipId} place="top" positionStrategy="fixed" />
    </StyledWrapper>
  );
};

export default ResponseErrorsCard;
