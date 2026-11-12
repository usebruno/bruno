import StyledWrapper from './StyledWrapper';

const DropZone = ({ icon: Icon, title, hint, children, 'data-testid': dataTestId }) => (
  <StyledWrapper data-testid={dataTestId}>
    <Icon size={26} strokeWidth={1.6} className="drop-zone-icon" aria-hidden="true" />
    <span className="drop-zone-title">{title}</span>
    <span className="drop-zone-text">{children}</span>
    <span className="drop-zone-hint">{hint}</span>
  </StyledWrapper>
);

export default DropZone;
