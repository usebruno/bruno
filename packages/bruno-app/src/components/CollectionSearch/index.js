import React, { useState, useMemo, useRef, useEffect } from 'react';
import Modal from 'components/Modal';

const searchCollection = (collection, term) => {
  const results = [];
  const search = (items, path = []) => {
    items.forEach(item => {
      const itemPath = [...path, item.name];

      if (item.type === 'http-request') {
        const matches = [];

        // Search in name
        if (item.name.toLowerCase().includes(term.toLowerCase())) {
          matches.push({ type: 'name', value: item.name });
        }

        // Search in URL
        if (item.request?.url?.toLowerCase().includes(term.toLowerCase())) {
          matches.push({ type: 'url', value: item.request.url });
        }

        // Search in headers
        item.request?.headers?.forEach(header => {
          if (header.name.toLowerCase().includes(term.toLowerCase()) || 
              header.value.toLowerCase().includes(term.toLowerCase())) {
            matches.push({ type: 'header', value: `${header.name}: ${header.value}` });
          }
        });

        // Search in body
        if (item.request?.body?.mode === 'json' && item.request.body.json) {
          const bodyJson = JSON.stringify(item.request.body.json);
          if (bodyJson.toLowerCase().includes(term.toLowerCase())) {
            matches.push({ type: 'body', value: bodyJson });
          }
        } else if (item.request?.body?.mode === 'text' && item.request.body.text) {
          if (item.request.body.text.toLowerCase().includes(term.toLowerCase())) {
            matches.push({ type: 'body', value: item.request.body.text });
          }
        }

        // Search in script
        if (item.request?.script?.req?.toLowerCase().includes(term.toLowerCase())) {
          matches.push({ type: 'script', value: item.request.script.req });
        }

        // Search in assertions
        item.request?.assertions?.forEach(assertion => {
          if (assertion.name.toLowerCase().includes(term.toLowerCase()) || 
              assertion.value.toLowerCase().includes(term.toLowerCase())) {
            matches.push({ type: 'assertion', value: `${assertion.name}: ${assertion.value}` });
          }
        });

        // Search in tests
        if (item.request?.tests?.toLowerCase().includes(term.toLowerCase())) {
          matches.push({ type: 'test', value: item.request.tests });
        }

        if (matches.length > 0) {
          results.push({ item, path: itemPath, matches });
        }
      }

      if (item.items) {
        search(item.items, itemPath);
      }
    });
  };
  search(collection.items);
  return results;
};

const HighlightedText = ({ text, highlight }) => {
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? 
          <mark key={i} className="bg-yellow-200 text-gray-900">{part}</mark> : 
          part
      )}
    </span>
  );
};

const CollectionSearch = ({ collection, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsRef = useRef(null);
  const inputRef = useRef(null);

  const searchResults = useMemo(() => {
    return searchTerm ? searchCollection(collection, searchTerm) : [];
  }, [collection, searchTerm]);

  useEffect(() => {
    setSelectedIndex(searchResults.length > 0 ? 0 : -1);
  }, [searchResults]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prevIndex => 
        prevIndex < searchResults.length - 1 ? prevIndex + 1 : prevIndex
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prevIndex => prevIndex > 0 ? prevIndex - 1 : 0);
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <Modal size="md" title={'Search'} handleCancel={onClose} hideFooter={true}>
      <div className="w-full max-w-md mx-auto">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search HTTP requests..."
            className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none"
          />
          <svg
            className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {searchResults.length > 0 && (
          <div ref={resultsRef} className="mt-4 bg-white border border-gray-300 rounded-md shadow-sm max-h-96 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className={`px-4 py-3 cursor-pointer border-b border-gray-200 last:border-b-0 ${
                  index === selectedIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium text-gray-900">
                  <HighlightedText text={result.item.name} highlight={searchTerm} />
                  {result.matches.some(m => m.type === 'name') && (
                    <span className="ml-2 text-xs font-normal text-gray-500">(name match)</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  {result.path.slice(0, -1).join(' > ')}
                </div>
                {result.matches.filter(match => match.type !== 'name').map((match, matchIndex) => (
                  <div key={matchIndex} className="mt-1 text-sm flex items-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium mr-2 ${
                      match.type === 'url' ? 'bg-green-100 text-green-800' :
                      match.type === 'header' ? 'bg-purple-100 text-purple-800' :
                      match.type === 'body' ? 'bg-yellow-100 text-yellow-800' :
                      match.type === 'script' ? 'bg-blue-100 text-blue-800' :
                      match.type === 'assertion' ? 'bg-indigo-100 text-indigo-800' :
                      match.type === 'test' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {match.type.charAt(0).toUpperCase() + match.type.slice(1)}
                    </span>
                    <span className="text-gray-600">
                      <HighlightedText text={match.value} highlight={searchTerm} />
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CollectionSearch;