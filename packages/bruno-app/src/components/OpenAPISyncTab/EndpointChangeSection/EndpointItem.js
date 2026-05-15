import React from 'react';
import MethodBadge from 'ui/MethodBadge';
import { useTranslation } from 'react-i18next';

// Simple endpoint item for non-review mode
const EndpointItem = ({ endpoint, type, actions }) => {
  const { t } = useTranslation();
  return (
    <div className={`endpoint-item type-${type}`}>
      <div className="endpoint-row">
        <MethodBadge method={endpoint.method} />
        <span className="endpoint-path">{endpoint.path}</span>
        {endpoint.summary && <span className="endpoint-summary">{endpoint.summary}</span>}
        {endpoint.name && !endpoint.summary && <span className="endpoint-summary">{endpoint.name}</span>}
        {endpoint.deprecated && <span className="deprecated-tag">{t('OPENAPI_SYNC.DEPRECATED')}</span>}
        {actions && <div className="endpoint-actions">{actions}</div>}
      </div>
    </div>
  );
};

export default EndpointItem;
