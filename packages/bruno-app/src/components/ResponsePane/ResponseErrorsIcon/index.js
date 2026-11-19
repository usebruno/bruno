import React from 'react';
import { IconAlertCircle } from '@tabler/icons';
import Tooltip from 'ui/Tooltip';
import useTooltipId from 'hooks/useTooltipId';
import { pluralizeWord } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const ResponseErrorsIcon = ({ count, onClick }) => {
  const anchorId = useTooltipId('response-errors-icon');

  return (
    <>
      <StyledWrapper
        type="button"
        id={anchorId}
        data-testid="response-errors-icon"
        onClick={onClick}
        aria-label={`Show ${count} ${pluralizeWord('error', count)}`}
      >
        <IconAlertCircle size={16} strokeWidth={1.5} />
        <sup className="font-medium" data-testid="response-errors-icon-count">{count}</sup>
      </StyledWrapper>
      <Tooltip anchorId={anchorId} content={`Show ${pluralizeWord('error', count)}`} place="bottom" />
    </>
  );
};

export default ResponseErrorsIcon;
