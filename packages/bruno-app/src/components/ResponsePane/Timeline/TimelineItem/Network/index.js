const Network = ({ logs }) => {
  return (
    <div className="bg-black/5 text-white network-logs rounded overflow-auto h-96">
      <pre className="whitespace-pre-wrap">
        {logs.map((entry, index) => (
          <NetworkLogsEntry key={index} entry={entry} />
        ))}
      </pre>
    </div>
  )
}

const NetworkLogsEntry = ({ entry }) => {
  const { type, message } = entry;
  let className = '';

  switch (type) {
    case 'request':
      className = 'text-blue-500';
      break;
    case 'response':
      className = 'text-green-500';
      break;
    case 'error':
      className = 'text-red-500';
      break;
    case 'tls':
      className = 'text-purple-500';
      break;
    case 'info':
      className = 'text-yellow-500';
      break;
    default:
      className = 'text-gray-400';
      break;
  }

  return (
    <div className={`${className}`}>
      <div>{message}</div>
    </div>
  );
};


export default Network;