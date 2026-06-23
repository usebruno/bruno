import React, { useMemo, useState } from 'react';
import Modal from 'components/Modal';
import { collectCollectionExamples } from 'utils/mock-responses';

const ImportFromExampleModal = ({ collection, onClose, onImport }) => {
  const [query, setQuery] = useState('');
  const examples = useMemo(() => collectCollectionExamples(collection), [collection]);

  const filteredExamples = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return examples;
    }

    return examples.filter(({ item, example }) => {
      const haystack = [
        item.name,
        example.name,
        item.pathname,
        example.request?.url
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [examples, query]);

  return (
    <Modal size="lg" title="Import from example" handleCancel={onClose}>
      <div className="px-4 pb-4">
        <input
          type="text"
          className="w-full mb-3"
          placeholder="Search requests or examples"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="max-h-80 overflow-auto border rounded-md">
          {filteredExamples.length === 0 ? (
            <div className="text-sm opacity-70 p-4">No examples found in this collection.</div>
          ) : (
            filteredExamples.map(({ item, example }) => (
              <button
                key={`${item.uid}-${example.uid}`}
                type="button"
                className="w-full text-left px-4 py-3 border-b hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => onImport({ item, example })}
              >
                <div className="font-medium text-sm">{example.name}</div>
                <div className="text-xs opacity-70 mt-1">{item.name}</div>
                <div className="text-xs opacity-60 mt-1 break-all">
                  {(example.request?.method || item.request?.method || 'GET').toUpperCase()} {example.request?.url || item.request?.url}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ImportFromExampleModal;
