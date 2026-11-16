import { IconArrowLeft, IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const PageHeader = ({ title, description, onBack, onClose }) => (
  <StyledWrapper>
    {onBack && (
      <button
        type="button"
        className="back-button"
        aria-label="Back"
        onClick={onBack}
        autoFocus
        data-testid="open-collection-back"
      >
        <IconArrowLeft size={16} strokeWidth={2} />
      </button>
    )}
    <div className="page-header-text">
      <h3 data-testid="open-collection-page-title">{title}</h3>
      {description && <span className="page-header-description">{description}</span>}
    </div>
    <button
      type="button"
      className="close-button"
      aria-label="Close"
      onClick={onClose}
      data-testid="open-collection-close"
    >
      <IconX size={16} strokeWidth={1.75} />
    </button>
  </StyledWrapper>
);

export default PageHeader;
