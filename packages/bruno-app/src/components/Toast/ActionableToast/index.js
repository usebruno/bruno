import React from 'react';
import toast from 'react-hot-toast';
import { IconX } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

/**
 * A reusable toast shell with:
 *  - Colored left accent strip
 *  - Close (x) button
 *  - Slide-in / slide-out-right animation via react-hot-toast's t.visible
 *  - Theme-aware background, text, and border
 *
 * Props:
 *  - t            — the toast instance from react-hot-toast (required)
 *  - accentColor  — CSS color for the left strip (default: theme.status.danger.text)
 *  - maxWidth     — max width in px (default: 420)
 *  - testId       — optional data-testid on the toast root (for e2e)
 *  - children     — toast body content
 */
const ActionableToast = ({ t, accentColor, maxWidth = 420, testId, children }) => {
  const { theme } = useTheme();
  const accent = accentColor || theme.status?.danger?.text || theme.colors?.text?.danger;

  return (
    <StyledWrapper
      data-testid={testId}
      $maxWidth={maxWidth}
      style={{
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? 'translateX(0)' : 'translateX(100%)'
      }}
    >
      <div className="toast-accent" style={{ background: accent }} />
      <div className="toast-body">
        <button
          type="button"
          className="toast-close"
          aria-label="Close toast"
          data-testid={testId ? `${testId}-close` : undefined}
          onClick={() => toast.dismiss(t.id)}
        >
          <IconX size={14} />
        </button>
        {children}
      </div>
    </StyledWrapper>
  );
};

/**
 * Helper to show an ActionableToast.
 *
 * Usage:
 *   showActionableToast({
 *     accentColor: theme.status.warning.text,
 *     render: (t) => <div>Something happened</div>
 *   });
 */
export const showActionableToast = ({ accentColor, maxWidth, position = 'bottom-right', duration = Infinity, render }) => {
  return toast.custom(
    (t) => (
      <ActionableToast t={t} accentColor={accentColor} maxWidth={maxWidth}>
        {render(t)}
      </ActionableToast>
    ),
    { duration, position }
  );
};

export default ActionableToast;
