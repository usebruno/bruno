const Network = ({ logs }) => {
  return (
    <div className="bg-black/5 text-white network-logs rounded overflow-auto h-96">
      <pre className="whitespace-pre-wrap">
        {logs.map((currentLog, index) => {
          if (index > 0 && currentLog?.type === 'separator') {
            return <div className="border-t-2 border-gray-500 w-full my-2" key={index} />;
          }
          const nextLog = logs[index + 1];
          const isSameLogType = nextLog?.type === currentLog?.type;
          return <>
            <NetworkLogsEntry key={index} entry={currentLog} />
              {!isSameLogType && <div className="mt-4"/>}
            </>;
        })}
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