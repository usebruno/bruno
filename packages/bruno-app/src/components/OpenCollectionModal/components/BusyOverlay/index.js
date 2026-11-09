import { useCallback, useState } from 'react';
import { IconLoader2 } from '@tabler/icons';
import { returnFocusAfterOverlay } from '../../utils/focus';
import StyledWrapper from './StyledWrapper';

const BusyOverlay = ({ children, onCancel }) => {
  const [previouslyFocused] = useState(() => document.activeElement);

  const holdFocus = useCallback((overlay) => {
    overlay.querySelector('.busy-cancel')?.focus();
    return () => returnFocusAfterOverlay(previouslyFocused);
  }, [previouslyFocused]);

  return (
    <StyledWrapper ref={holdFocus} role="status" data-testid="open-collection-busy">
      <IconLoader2 size={16} className="busy-spinner" aria-hidden="true" />
      <span className="busy-label">{children}</span>
      {onCancel ? (
        <button type="button" className="busy-cancel text-link hover:underline" onClick={onCancel} data-testid="open-collection-busy-cancel">
          Cancel
        </button>
      ) : null}
    </StyledWrapper>
  );
};

export default BusyOverlay;
