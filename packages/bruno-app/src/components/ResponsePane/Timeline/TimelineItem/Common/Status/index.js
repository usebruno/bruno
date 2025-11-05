const Status = ({ statusCode, statusText }) => {
  return (
    <span
      className={`${
        statusColor(statusCode) || 'text-white'
      } font-bold`}
    >
      {statusCode}{' '}
      {statusText || ''}
    </span>
  )
}

const statusColor = (statusCode) => {
  if (statusCode >= 200 && statusCode < 300) {
    return 'text-green-500';
  } else if (statusCode >= 300 && statusCode < 400) {
    return 'text-yellow-500';
  } else if (statusCode >= 400 && statusCode < 600) {
    return 'text-red-500';
  } else {
    return 'text-gray-500';
  }
};

export default Status;