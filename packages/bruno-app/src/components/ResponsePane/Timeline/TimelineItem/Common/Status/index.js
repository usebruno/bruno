import { useTheme } from 'providers/Theme';

const Status = ({ statusCode, statusText }) => {
  const { theme } = useTheme();

  let statusColor = theme.colors.text.muted;
  if (statusCode >= 200 && statusCode < 300) {
    statusColor = theme.requestTabPanel.responseOk;
  } else if (statusCode >= 300 && statusCode < 400) {
    statusColor = theme.colors.text.warning;
  } else if (statusCode >= 400 && statusCode < 600) {
    statusColor = theme.requestTabPanel.responseError;
  }

  return (
    <span className="timeline-status" style={{ color: statusColor, fontWeight: 'bold' }}>
      {statusCode}{' '}
      {statusText || ''}
    </span>
  );
};

export default Status;
