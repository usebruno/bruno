import StyledWrapper from './StyledWrapper';

const DropZone = ({ icon: Icon, iconSize = 26, title, hint, shortcut, children, isDragOver = false, dragHandlers, 'data-testid': dataTestId }) => (
  <StyledWrapper className={isDragOver ? 'is-drag-over' : undefined} data-testid={dataTestId} {...dragHandlers}>
    <Icon size={iconSize} strokeWidth={1.6} className="drop-zone-icon" aria-hidden="true" />
    <span className="drop-zone-title">{title}</span>
    <span className="drop-zone-text">
      {children}
      {shortcut ? <span className="drop-zone-shortcut" data-testid={`${dataTestId}-shortcut`}>{shortcut}</span> : null}
    </span>
    <span className="drop-zone-hint">{hint}</span>
  </StyledWrapper>
);

export default DropZone;
