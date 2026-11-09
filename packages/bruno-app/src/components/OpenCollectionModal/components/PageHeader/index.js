import { IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const PageHeader = ({ title, description, onClose }) => (
  <StyledWrapper>
    <div className="page-header-text">
      <h3 data-testid="open-collection-page-title">{title}</h3>
      <span className="page-header-description">{description}</span>
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
