import { IconArrowLeft, IconX } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from './StyledWrapper';

const PageHeader = ({ title, description, onBack, onClose }) => (
  <StyledWrapper>
    {onBack && (
      <ActionIcon
        type="button"
        size="lg"
        className="back-button"
        aria-label="Back"
        onClick={onBack}
        autoFocus
        data-testid="open-collection-back"
      >
        <IconArrowLeft size={16} strokeWidth={2} />
      </ActionIcon>
    )}
    <div className="page-header-text">
      <h3 data-testid="open-collection-page-title">{title}</h3>
      {description && <span className="page-header-description">{description}</span>}
    </div>
    <ActionIcon
      type="button"
      size="lg"
      aria-label="Close"
      onClick={onClose}
      data-testid="open-collection-close"
    >
      <IconX size={16} strokeWidth={1.75} />
    </ActionIcon>
  </StyledWrapper>
);

export default PageHeader;
