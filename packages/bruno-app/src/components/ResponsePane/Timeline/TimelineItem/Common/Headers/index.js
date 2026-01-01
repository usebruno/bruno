import { useState } from 'react';
import { useTheme } from 'providers/Theme';
import { rgba } from 'polished';

const HeadersBlock = ({ headers, type }) => {
  const { theme } = useTheme();
  const [areHeadersCollapsed, toggleHeaders] = useState(true);

  return (
    <div className="collapsible-section mt-2">
      <div className="section-header" onClick={() => toggleHeaders(!areHeadersCollapsed)}>
        <pre className="flex flex-row items-center" style={{ color: rgba(theme.primary.solid, 0.8) }}>
          <div style={{ opacity: 0.7 }}>{areHeadersCollapsed ? '▼' : '▶'}</div> Headers
          {headers && Object.keys(headers).length > 0
            && <div className="ml-1">({Object.keys(headers).length})</div>}
        </pre>
      </div>
      {areHeadersCollapsed && (
        <div className="mt-1">
          {headers && Object.keys(headers).length > 0
            ? <Headers headers={headers} type={type} />
            : <div className="timeline-item-timestamp">No Headers found</div>}
        </div>
      )}
    </div>
  );
};

const Headers = ({ headers, type }) => {
  if (Array.isArray(headers)) {
    return (
      <div className="mt-1">
        {headers.map((header, index) => (
          <pre key={index} className="mb-1 whitespace-pre-wrap">
            {type === 'request' ? '>' : '<'}&nbsp;<span className="opacity-60">{header?.name}:</span>
            <span className="whitespace-pre-wrap">{String(header?.value)}</span>
          </pre>
        ))}
      </div>
    );
  } else {
    return (
      <div className="mt-1">
        {Object.entries(headers).map(([key, value], index) => (
          <pre key={index} className="mb-1 whitespace-pre-wrap">
            {type === 'request' ? '>' : '<'}&nbsp;<span className="opacity-60">{key}:</span>
            <span>{String(value)}</span>
          </pre>
        ))}
      </div>
    );
  }
};

export default HeadersBlock;
