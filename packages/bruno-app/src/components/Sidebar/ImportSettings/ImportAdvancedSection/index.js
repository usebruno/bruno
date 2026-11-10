import { useState } from 'react';
import { IconChevronRight } from '@tabler/icons';
import { stopEnterFromConfirmingModal } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const ImportAdvancedSection = ({ title = 'Advanced', children }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <StyledWrapper className="mt-4 pt-4">
      <button
        type="button"
        className="advanced-toggle flex items-center gap-1 cursor-pointer text-muted"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={stopEnterFromConfirmingModal}
        data-testid="import-advanced-section-toggle"
      >
        <IconChevronRight className="advanced-chevron" size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="font-medium">{title}</span>
      </button>
      <div key={expanded ? 'open' : 'closed'} className="advanced-content flex flex-col gap-4">{children}</div>
    </StyledWrapper>
  );
};

export default ImportAdvancedSection;
