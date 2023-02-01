import React, { useState, useEffect } from 'react';
import path from 'path';
import { get, each, cloneDeep } from 'lodash';
import { findItemInCollection } from 'utils/collections';
import { IconRefresh, IconCircleCheck, IconCircleX, IconCheck, IconX, IconRun } from '@tabler/icons';
import ResponsePane from './ResponsePane';
import StyledWrapper from './StyledWrapper';

const getRelativePath = (fullPath, pathname) => {
  let relativePath = path.relative(fullPath, pathname);
  const { dir, name } = path.parse(relativePath);
  return path.join(dir, name);
}

export default function RunnerResults({collection}) {
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if(!collection.runnerResult) {
      setSelectedItem(null);
    }
  }, [collection, setSelectedItem]);

  const collectionCopy = cloneDeep(collection);
  const items = cloneDeep(get(collection, 'runnerResult.items', []));
  each(items, (item) => {
    const info = findItemInCollection(collectionCopy, item.uid);

    item.name = info.name;
    item.type = info.type;
    item.filename = info.filename;
    item.pathname = info.pathname;
    item.relativePath = getRelativePath(collection.pathname, info.pathname);

    if(item.testResults) {
      const failed = item.testResults.filter((result) => result.status === 'fail');

      item.testStatus = failed.length ? 'fail' : 'pass';
    } else {
      item.testStatus = 'pass';
    }
  });

  const passedRequests = items.filter((item) => item.testStatus === 'pass');
  const failedRequests = items.filter((item) => item.testStatus === 'fail');

  return (
    <StyledWrapper className='px-4'>
      <div className='font-medium mt-6 mb-4 title flex items-center'>
        Runner
        <IconRun size={20} strokeWidth={1.5} className='ml-2'/>
      </div>
      <div className='flex'>
        <div className='flex flex-col flex-1'>
          <div className="py-2 font-medium test-summary">
            Total Requests: {items.length}, Passed: {passedRequests.length}, Failed: {failedRequests.length}
          </div>
          {items.map((item) => {
            return (
              <div key={item.uid}>
                <div className="item-path mt-2">
                  <div className="flex items-center">
                    <span>
                        {item.testStatus === 'pass' ? (
                          <IconCircleCheck className="test-success" size={20} strokeWidth={1.5}/>
                        ) : (
                          <IconCircleX className="test-failure" size={20} strokeWidth={1.5}/>
                        )}
                    </span>
                    <span className='mr-1 ml-2'>{item.relativePath}</span>
                    {item.status !== "completed" ? (
                      <IconRefresh className="animate-spin ml-1" size={18} strokeWidth={1.5}/>
                    ) : (
                      <span className='text-xs link cursor-pointer' onClick={() => setSelectedItem(item)}>
                        (<span className='mr-1'>
                          {get(item.responseReceived, 'status')}
                        </span>
                        <span>
                          {get(item.responseReceived, 'statusText')}
                        </span>)
                      </span>
                    )}
                  </div>

                  <ul className="pl-8">
                    {item.testResults ? item.testResults.map((result) => (
                      <li key={result.uid} className="py-1">
                        {result.status === 'pass' ? (
                          <span className="test-success flex items-center">
                            <IconCheck size={18} strokeWidth={2} className="mr-2"/>
                            {result.description}
                          </span>
                        ) : (
                          <>
                            <span className="test-failure flex items-center">
                              <IconX size={18} strokeWidth={2} className="mr-2"/>
                              {result.description}
                            </span>
                            <span className="error-message pl-8 text-xs">
                              {result.error}
                            </span>
                          </>
                        )}
                      </li>
                    )): null}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        <div className='flex flex-1' style={{width: '50%'}}>
          {selectedItem ? (
            <div className='flex flex-col w-full overflow-auto'>
              <div className="flex items-center px-3 mb-4 font-medium">
                <span className='mr-2'>{selectedItem.relativePath}</span>
                <span>
                  {selectedItem.testStatus === 'pass' ? (
                    <IconCircleCheck className="test-success" size={20} strokeWidth={1.5}/>
                  ) : (
                    <IconCircleX className="test-failure" size={20} strokeWidth={1.5}/>
                  )}
                </span>
              </div>
              {/* <div className='px-3 mb-4 font-medium'>{selectedItem.relativePath}</div> */}
              <ResponsePane item={selectedItem} collection={collection}/>
            </div>
          ) : null}
        </div>
      </div>
    </StyledWrapper>
  );
};