import { useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import QueryResponse from 'components/ResponsePane/QueryResponse/index';

const BodyBlock = ({ collection, data, dataBuffer, headers, error, item, type }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasBody = !!(data || dataBuffer);

  return (
    <div className="tl-block">
      <button
        type="button"
        className="tl-block-h"
        aria-expanded={isOpen}
        data-testid="response-body-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="tl-block-chev">
          {isOpen ? <IconChevronDown size={12} strokeWidth={2} /> : <IconChevronRight size={12} strokeWidth={2} />}
        </span>
        Body
      </button>
      {isOpen && (
        hasBody ? (
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
          <div className="tl-empty">No Body found</div>
        )
      )}
    </div>
  );
};

export default BodyBlock;
