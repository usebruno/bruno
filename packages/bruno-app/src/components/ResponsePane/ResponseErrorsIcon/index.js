import React, { useId } from 'react';
import { IconAlertCircle } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import { pluralizeWord } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const ResponseErrorsIcon = ({ count, onClick }) => {
  const toolhintId = `response-errors-icon-${useId().replace(/:/g, '')}`;

  return (
    <>
      <StyledWrapper
        type="button"
        id={toolhintId}
        data-testid="response-errors-icon"
        onClick={onClick}
        aria-label={`Show ${count} ${pluralizeWord('error', count)}`}
      >
        <IconAlertCircle size={16} strokeWidth={1.5} />
        <sup className="font-medium" data-testid="response-errors-icon-count">{count}</sup>
      </StyledWrapper>
      <ToolHint toolhintId={toolhintId} text={`Show ${pluralizeWord('error', count)}`} place="bottom" />
    </>
  );
};

export default ResponseErrorsIcon;
