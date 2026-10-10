import React from 'react';
import { IconCheck, IconCopy } from '@tabler/icons';
import useCopyToClipboard from 'hooks/useCopyToClipboard';
import { formatResponseErrorForClipboard } from 'utils/response-pane-errors';
import CardActionIcon from '../CardActionIcon';

const CopyErrorButton = ({ error, tooltipId }) => {
  const { copied, copyToClipboard } = useCopyToClipboard(1500);

  return (
    <CardActionIcon
      label="Copy error"
      tooltipId={tooltipId}
      data-testid="response-errors-copy"
      onClick={() => copyToClipboard(formatResponseErrorForClipboard(error))}
    >
      {copied ? <IconCheck size={16} strokeWidth={1.5} /> : <IconCopy size={16} strokeWidth={1.5} />}
    </CardActionIcon>
  );
};

export default CopyErrorButton;
