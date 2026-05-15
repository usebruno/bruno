import QueryResponse from 'components/ResponsePane/QueryResponse/index';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const BodyBlock = ({ collection, data, dataBuffer, headers, error, item, type }) => {
  const { t } = useTranslation();
  const [isBodyCollapsed, toggleBody] = useState(true);
  return (
    <div className="collapsible-section">
      <div className="section-header" onClick={() => toggleBody(!isBodyCollapsed)}>
        <pre className="flex flex-row items-center">
          <div className="opacity-70">{isBodyCollapsed ? '▼' : '▶'}</div> {t('TIMELINE.BODY')}
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
                docKey={`timeline-body:${type}:${item?.uid}`}
              />
            </div>
          ) : (
            <div className="timeline-item-timestamp">{t('TIMELINE.NO_BODY')}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default BodyBlock;
