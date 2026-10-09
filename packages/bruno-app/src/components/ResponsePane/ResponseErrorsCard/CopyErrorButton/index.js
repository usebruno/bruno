import React from 'react';
import { IconCheck, IconCopy } from '@tabler/icons';
import useCopyToClipboard from 'hooks/useCopyToClipboard';
import { formatResponseErrorForClipboard } from 'utils/response-pane-errors';
import ActionIcon from 'ui/ActionIcon';

const CopyErrorButton = ({ error, tooltipId }) => {
  const { copied, copyToClipboard } = useCopyToClipboard(1500);

  return (
    <ActionIcon
      aria-label="Copy error"
      data-tooltip-id={tooltipId}
      data-tooltip-content="Copy error"
      data-testid="response-errors-copy"
      onClick={() => copyToClipboard(formatResponseErrorForClipboard(error))}
    >
      {copied ? <IconCheck size={16} strokeWidth={1.5} /> : <IconCopy size={16} strokeWidth={1.5} />}
    </ActionIcon>
  );
};

export default CopyErrorButton;
