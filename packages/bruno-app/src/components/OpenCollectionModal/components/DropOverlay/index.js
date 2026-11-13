import { IconUpload } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const DropOverlay = () => (
  <StyledWrapper className="drop-overlay" role="status" data-testid="open-collection-drop-overlay">
    <div className="drop-overlay-content">
      <span className="drop-overlay-icon" aria-hidden="true">
        <IconUpload size={22} strokeWidth={1.75} />
      </span>
      <span className="drop-overlay-title">Drop to open</span>
      <span className="drop-overlay-text">
        Collection folders open in place. Files (.yml, .zip, Postman, Insomnia, OpenAPI, WSDL) go to Import,
        where you choose where the new collections go.
      </span>
    </div>
  </StyledWrapper>
);

export default DropOverlay;
