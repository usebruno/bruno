import { IconAlertTriangle, IconInfoCircle, IconX } from '@tabler/icons';
import { focusNextTabbable } from '../../utils/focus';
import StyledWrapper from './StyledWrapper';

const NOTE_ICONS = {
  info: IconInfoCircle,
  warning: IconAlertTriangle
};

const Note = ({ tone, children, action, onDismiss }) => {
  const Icon = NOTE_ICONS[tone];
  const dismiss = (event) => {
    focusNextTabbable(event.currentTarget);
    onDismiss();
  };
  return (
    <StyledWrapper $tone={tone} role="status" data-testid="open-collection-note">
      <Icon size={14} strokeWidth={2} className="note-icon" aria-hidden="true" />
      <span className="note-text">{children}</span>
      {action ? (
        <button
          type="button"
          className="text-link hover:underline whitespace-nowrap"
          onClick={action.onClick}
          data-testid="open-collection-note-action"
        >
          {action.label}
        </button>
      ) : null}
      <button
        type="button"
        className="note-dismiss"
        aria-label="Dismiss"
        onClick={dismiss}
        data-testid="open-collection-note-dismiss"
      >
        <IconX size={11} strokeWidth={2.2} />
      </button>
    </StyledWrapper>
  );
};

export default Note;
