import { useCallback, useState } from 'react';
import { IconLoader2 } from '@tabler/icons';
import { returnFocusTo } from '../../utils/focus';
import StyledWrapper from './StyledWrapper';

const BusyOverlay = ({ children, onCancel }) => {
  const [previouslyFocused] = useState(() => document.activeElement);

  const returnFocusOnClose = useCallback(() => () => returnFocusTo(previouslyFocused), [previouslyFocused]);

  return (
    <StyledWrapper ref={returnFocusOnClose} role="status" data-testid="open-collection-busy">
      <IconLoader2 size={16} className="busy-spinner" aria-hidden="true" />
      <span className="busy-label">{children}</span>
      {onCancel && (
        <button type="button" className="text-link hover:underline" onClick={onCancel} autoFocus data-testid="open-collection-busy-cancel">
          Cancel
        </button>
      )}
    </StyledWrapper>
  );
};

export default BusyOverlay;
