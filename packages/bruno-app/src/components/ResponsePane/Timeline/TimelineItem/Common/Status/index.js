import React from 'react';
import { useTheme } from 'providers/Theme';
import { rgba } from 'polished';

const Status = ({ statusCode }) => {
  const { theme } = useTheme();
  const isStringCode = typeof statusCode === 'string' && statusCode.length > 0;

  let color = theme.colors.text.muted;
  if (statusCode >= 200 && statusCode < 300) {
    color = theme.requestTabPanel.responseOk;
  } else if (statusCode >= 300 && statusCode < 400) {
    color = theme.colors.text.warning;
  } else if (statusCode >= 400 && statusCode < 600) {
    color = theme.requestTabPanel.responseError;
  }

  const isStatusKnown = (typeof statusCode === 'number' && statusCode > 0) || isStringCode;
  const background = isStatusKnown ? rgba(color, 0.12) : 'transparent';

  return (
    <span
      className="timeline-status"
      style={{
        color,
        background,
        fontWeight: 600,
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 3,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap'
      }}
    >
      {statusCode}
    </span>
  );
};

export default Status;
