import React, { useState, useEffect } from 'react';
import CodeEditor from 'components/CodeEditor';
import { get } from 'lodash';
import { useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme/index';
import StyledWrapper from './StyledWrapper';
import GrpcError from '../GrpcError';
import { IconChevronDown, IconChevronUp } from '@tabler/icons';

const GrpcQueryResult = ({ item, collection }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [showErrorMessage, setShowErrorMessage] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(0);

  const response = item.response || {};
  const responsesList = response?.responses || [];
  const reversedResponsesList = [...responsesList].reverse();
  const hasError = response.isError;
  const hasResponses = responsesList.length > 0;
  const errorMessage = response.error;

  useEffect(() => {
    if (hasError) {
      setShowErrorMessage(true);
    }
  }, [response, hasError]);

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
        <div className="empty-state">No messages received</div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="w-full h-full relative flex flex-col mt-2" data-testid="grpc-response-content">
      {hasError && showErrorMessage && <GrpcError error={errorMessage} onClose={() => setShowErrorMessage(false)} />}
      {hasResponses && (
        <div className={`responses-container ${responsesList.length === 1 ? 'single' : 'multi'}`} data-testid="grpc-responses-container">
          {responsesList.length === 1 ? (
            <div className="h-full" data-testid="grpc-single-response">
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
            <div className="messages-list" data-testid="grpc-responses-list">
              {reversedResponsesList.map((resp, index) => {
                const originalIndex = responsesList.length - index - 1;
                const isExpanded = expandedIndex === index;

                return (
                  <div
                    key={originalIndex}
                    className={`message-item ${isExpanded ? 'expanded' : 'collapsed'} ${index === reversedResponsesList.length - 1 ? 'last' : ''}`}
                    data-testid={`grpc-response-item-${originalIndex}`}
                  >
                    <div
                      className="message-header"
                      onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                    >
                      <span className="message-label">
                        Response {originalIndex + 1}
                        {index === 0 && <span className="latest-badge">Latest</span>}
                      </span>
                      <button className="toggle-btn">
                        {isExpanded ? (
                          <IconChevronUp size={16} strokeWidth={1.5} />
                        ) : (
                          <IconChevronDown size={16} strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="message-content">
                        <CodeEditor
                          collection={collection}
                          font={get(preferences, 'font.codeFont', 'default')}
                          fontSize={get(preferences, 'font.codeFontSize')}
                          theme={displayedTheme}
                          value={formatJSON(resp)}
                          mode="application/json"
                          readOnly={true}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {hasError && !hasResponses && !showErrorMessage && (
        <div className="empty-state">
          No messages received. A server error occurred but has been dismissed.
        </div>
      )}
    </StyledWrapper>
  );
};

export default GrpcQueryResult;
