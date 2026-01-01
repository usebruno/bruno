import QueryResponse from 'components/ResponsePane/QueryResponse/index';
import { useState } from 'react';
import { useTheme } from 'providers/Theme';
import { rgba } from 'polished';

const BodyBlock = ({ collection, data, dataBuffer, headers, error, item, type }) => {
  const { theme } = useTheme();
  const [isBodyCollapsed, toggleBody] = useState(true);
  return (
    <div className="collapsible-section">
      <div className="section-header" onClick={() => toggleBody(!isBodyCollapsed)}>
        <pre className="flex flex-row items-center" style={{ color: rgba(theme.primary.solid, 0.8) }}>
          <div style={{ opacity: 0.7 }}>{isBodyCollapsed ? '▼' : '▶'}</div> Body
        </pre>
      </div>
      {isBodyCollapsed && (
        <div className="mt-2">
          {data || dataBuffer ? (
            <div className="h-96 overflow-auto">
              <QueryResponse
                item={item}
                collection={collection}
                data={data}
                dataBuffer={dataBuffer}
                headers={headers}
                error={error}
                key={item?.uid}
                hideResultTypeSelector={type === 'request'}
              />
            </div>
          ) : (
            <div className="timeline-item-timestamp">No Body found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default BodyBlock;
