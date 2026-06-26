import React, { useState } from 'react';
import classnames from 'classnames';
import AmqpPublishConfig from './AmqpPublishConfig';
import AmqpConsumeConfig from './AmqpConsumeConfig';

const SUB_TABS = [
  { key: 'publish', label: 'Publish' },
  { key: 'consume', label: 'Consume' }
];

const AmqpBody = ({ item, collection }) => {
  const [activeSubTab, setActiveSubTab] = useState('publish');

  return (
    <div className="px-4 w-full h-full flex flex-col">
      <div className="flex items-center gap-4 border-b border-neutral-200 dark:border-neutral-700 mb-3">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            className={classnames('text-sm pb-2 -mb-px border-b-2 select-none', {
              'border-current font-medium': activeSubTab === tab.key,
              'border-transparent opacity-60 hover:opacity-90': activeSubTab !== tab.key
            })}
            onClick={() => setActiveSubTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {activeSubTab === 'publish' ? (
          <AmqpPublishConfig item={item} collection={collection} />
        ) : (
          <AmqpConsumeConfig item={item} collection={collection} />
        )}
      </div>
    </div>
  );
};

export default AmqpBody;
