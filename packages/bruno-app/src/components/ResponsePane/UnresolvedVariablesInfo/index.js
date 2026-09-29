import React from 'react';
import { useDispatch } from 'react-redux';
import { Tooltip } from 'react-tooltip';
import { IconCheck, IconCopy, IconInfoCircle, IconX } from '@tabler/icons';
import { dismissUnresolvedVariables } from 'providers/ReduxStore/slices/collections';
import useCopyToClipboard from 'hooks/useCopyToClipboard';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from './StyledWrapper';

const MAX_INLINE_NAMES_LENGTH = 40;

const UnresolvedVariableCount = ({ names, popoverId }) => {
  const { copied, copyToClipboard } = useCopyToClipboard(1500);

  return (
    <>
      <span
        className="variable-count"
        data-tooltip-id={popoverId}
        tabIndex={0}
        data-testid="unresolved-variables-count"
      >
        {names.length} {names.length === 1 ? 'variable' : 'variables'}
      </span>
      <Tooltip
        id={popoverId}
        className="variable-popover"
        place="bottom-start"
        positionStrategy="fixed"
        clickable
        noArrow
        opacity={1}
      >
        <div className="popover-header">
          <span>Unresolved variables</span>
          <ActionIcon
            size="xs"
            data-testid="unresolved-variables-copy"
            onClick={() => copyToClipboard(names.join('\n'))}
            aria-label="Copy unresolved variable names"
            label={copied ? 'Copied' : 'Copy variable names'}
          >
            {copied ? <IconCheck size={14} strokeWidth={1.5} /> : <IconCopy size={14} strokeWidth={1.5} />}
          </ActionIcon>
        </div>
        <ul className="variable-list scrollbar-hover" data-testid="unresolved-variables-popover">
          {names.map((name) => (
            <li key={name}><code>{name}</code></li>
          ))}
        </ul>
      </Tooltip>
    </>
  );
};

const UnresolvedVariablesInfo = ({ item, collection }) => {
  const dispatch = useDispatch();

  const names = item.unresolvedVariables;
  if (!names?.length) return null;

  const joinedNamesLength = names.join(', ').length;

  const handleClose = () => {
    dispatch(dismissUnresolvedVariables({ collectionUid: collection.uid, itemUid: item.uid }));
  };

  return (
    <StyledWrapper role="status" data-testid="unresolved-variables-info">
      <IconInfoCircle size={16} strokeWidth={1.5} className="info-icon" />
      <div className="info-message">
        {joinedNamesLength <= MAX_INLINE_NAMES_LENGTH ? (
          <>
            This request uses variables that could not be resolved:{' '}
            <span className="variable-names" data-testid="unresolved-variables-names">
              {names.map((name, index) => (
                <React.Fragment key={name}>
                  {index > 0 && ', '}
                  <code>{name}</code>
                </React.Fragment>
              ))}
            </span>.
          </>
        ) : (
          <>
            This request uses <UnresolvedVariableCount names={names} popoverId={`unresolved-variables-${item.uid}`} />{' '}
            that could not be resolved.
          </>
        )}
      </div>
      <ActionIcon
        size="xs"
        className="close-button"
        data-testid="unresolved-variables-info-close"
        onClick={handleClose}
        aria-label="Dismiss unresolved variables info"
      >
        <IconX size={16} strokeWidth={1.5} />
      </ActionIcon>
    </StyledWrapper>
  );
};

export default UnresolvedVariablesInfo;
