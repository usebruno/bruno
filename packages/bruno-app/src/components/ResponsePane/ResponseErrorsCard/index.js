import React from 'react';
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
import ActionIcon from 'ui/ActionIcon';
import useExpandedRows from 'hooks/useExpandedRows';
import useTooltipId from 'hooks/useTooltipId';
import CopyErrorButton from './CopyErrorButton';
import CollapsibleError from './CollapsibleError';
import ErrorDetails from './ErrorDetails';
import StyledWrapper from './StyledWrapper';

const ResponseErrorsCard = ({ errors, item, collection, isCardFullPane, onToggleCardFullPane, onClose }) => {
  const { isRowExpanded, areAllRowsExpanded, toggleRow, toggleAllRows } = useExpandedRows(errors.map((error) => error.id));
  const tooltipId = useTooltipId('response-errors-card');

  const isSingle = errors.length === 1;
  const title = isSingle ? errors[0].title : `${errors.length} errors`;

  const toggleAllLabel = areAllRowsExpanded ? 'Collapse all' : 'Expand all';
  const cardFullPaneLabel = isCardFullPane ? 'Restore height' : 'Expand to full pane';

  const body = isSingle ? (
    <ErrorDetails error={errors[0]} item={item} collection={collection} />
  ) : (
    errors.map((error) => (
      <CollapsibleError
        key={error.id}
        error={error}
        item={item}
        collection={collection}
        isExpanded={isRowExpanded(error.id)}
        onToggleExpanded={() => toggleRow(error.id)}
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
            <ActionIcon aria-label={toggleAllLabel} data-tooltip-id={tooltipId} data-tooltip-content={toggleAllLabel} data-testid="response-errors-toggle-all" onClick={toggleAllRows}>
              {areAllRowsExpanded ? <IconFold size={16} strokeWidth={1.5} /> : <IconArrowsMoveVertical size={16} strokeWidth={1.5} />}
            </ActionIcon>
          )}
          <ActionIcon aria-label={cardFullPaneLabel} data-tooltip-id={tooltipId} data-tooltip-content={cardFullPaneLabel} data-testid="response-errors-full-pane-toggle" onClick={onToggleCardFullPane} aria-pressed={isCardFullPane}>
            {isCardFullPane ? <IconArrowsDiagonalMinimize2 size={16} strokeWidth={1.5} /> : <IconArrowsDiagonal size={16} strokeWidth={1.5} />}
          </ActionIcon>
          <ActionIcon aria-label="Close" data-tooltip-id={tooltipId} data-tooltip-content="Close" data-testid="response-errors-close" onClick={onClose}>
            <IconX size={16} strokeWidth={1.5} />
          </ActionIcon>
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
