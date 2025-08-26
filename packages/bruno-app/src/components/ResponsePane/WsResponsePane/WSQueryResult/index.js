import React, { useState, useEffect } from 'react';
import Accordion from 'components/Accordion';
import CodeEditor from 'components/CodeEditor';
import { get } from 'lodash';
import { useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme/index';
import StyledWrapper from './StyledWrapper';
import { formatISO9075 } from 'date-fns';
import WSError from '../WSError';

const WSQueryResult = ({ item, collection }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [showErrorMessage, setShowErrorMessage] = useState(true);

  const response = item.response || {};
  const responsesList = response?.responses || [];
  // Reverse the responses list to show the most recent at the top
  const reversedResponsesList = [...responsesList].reverse();
  const hasError = response.isError;
  const hasResponses = responsesList.length > 0;
  const errorMessage = response.error;

  // Reset error visibility when a new response is received
  useEffect(() => {
    if (hasError) {
      setShowErrorMessage(true);
    }
  }, [response, hasError]);

  // Format a timestamp to a human-readable format
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';

    try {
      const date = new Date(timestamp);
      return formatISO9075(date);
    } catch (e) {
      return 'Invalid time';
    }
  };

  // Format JSON for display
  const formatJSON = (data) => {
    try {
      if (typeof data === 'string') {
        return JSON.stringify(JSON.parse(data), null, 2);
      }
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return typeof data === 'string' ? data : JSON.stringify(data);
    }
  };

  if (!hasResponses && !hasError) {
    return (
      <StyledWrapper className="w-full h-full relative flex flex-col">
        <div className="text-gray-500 dark:text-gray-400 p-4">No messages received</div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="w-full h-full relative flex flex-col mt-2">
      {hasError && showErrorMessage && <WSError error={errorMessage} onClose={() => setShowErrorMessage(false)} />}
      {hasResponses && (
        <div className={`overflow-y-auto ${responsesList.length === 1 ? 'flex-1' : ''}`}>
          {responsesList.length === 1 ? (
            // Single message - render directly without accordion
            <div className="h-full">
              <CodeEditor
                collection={collection}
                font={get(preferences, 'font.codeFont', 'default')}
                fontSize={get(preferences, 'font.codeFontSize')}
                theme={displayedTheme}
                value={formatJSON(reversedResponsesList[0])}
                mode="application/json"
                readOnly={true}
              />
            </div>
          ) : (
            // Multiple messages - use accordion
            <Accordion defaultIndex={0}>
              {reversedResponsesList.map((response, index) => {
                // Calculate the original response number (for display purposes)
                const originalIndex = responsesList.length - index - 1;

                return (
                  <Accordion.Item key={originalIndex} index={index}>
                    <Accordion.Header index={index} style={{ padding: '8px 12px', minHeight: '40px' }}>
                      <div className="flex justify-between w-full">
                        <div className="font-medium">
                          Response {originalIndex + 1} {index === 0 ? '(Latest)' : ''}
                        </div>
                      </div>
                    </Accordion.Header>
                    <Accordion.Content index={index} style={{ padding: '0px' }}>
                      <div className="h-60">
                        <CodeEditor
                          collection={collection}
                          font={get(preferences, 'font.codeFont', 'default')}
                          fontSize={get(preferences, 'font.codeFontSize')}
                          theme={displayedTheme}
                          value={formatJSON(response)}
                          mode="application/json"
                          readOnly={true}
                        />
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          )}
        </div>
      )}
      {hasError && !hasResponses && !showErrorMessage && (
        <div className="text-gray-500 dark:text-gray-400 p-4">
          No messages received. A server error occurred but has been dismissed.
        </div>
      )}
    </StyledWrapper>
  );
};

export default WSQueryResult;
