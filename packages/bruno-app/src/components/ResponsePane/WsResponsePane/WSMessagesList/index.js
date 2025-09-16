import React from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import { IconChevronUp, IconChevronDown, IconArrowUpRight, IconArrowDownLeft } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor/index';
import { useTheme } from 'providers/Theme';
import { useState } from 'react';
import { useSelector } from 'react-redux';

// Example message structure: { direction: 'incoming' | 'outgoing', timestamp, data }

const parseContent = (content) => {
  if (typeof content === 'string') {
    let isJSON = false;
    let resultContent = content;
    let trimmedContent = content;
    try {
      JSON.parse(content);
      isJSON = true;
      resultContent = JSON.stringify(resultContent, null, 2);
      trimmedContent = JSON.stringify(resultContent, null, 0);
    } catch (err) {
      // digest error
    }

    return {
      type: isJSON ? 'application/json' : 'text/plain',
      content: resultContent,
      sliced: trimmedContent.slice(0, 30)
    };
  }
  if (typeof content === 'object') {
    return {
      type: 'application/json',
      content: JSON.stringify(content, null, 2),
      sliced: JSON.stringify(content, null, 0).slice(0, 30)
    };
  }
};

const getDataTypeText = (type) => {
  const textMap = {
    'text/plain': 'RAW',
    'application/json': 'JSON'
  };
  return textMap[type] ?? 'RAW';
};

const WSMessageItem = ({ message, defaultOpen }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  const preferences = useSelector((state) => state.app.preferences);

  const { displayedTheme } = useTheme();

  const isIncoming = message.direction === 'incoming';
  let parsedContent = parseContent(message.message);

  const dataType = getDataTypeText(parsedContent.type);

  return (
    <div
      className={classnames('ws-message flex flex-col rounded border p-2', {
        'ws-incoming': isIncoming,
        'ws-outgoing': !isIncoming
      })}
    >
      <div
        className="flex items-center justify-between"
        onClick={(e) => {
          setIsOpen(!isOpen);
        }}
      >
        <div className="flex">
          <span
            className={classnames(
              'font-semibold flex items-center gap-1',
              isIncoming ? 'text-blue-700' : 'text-green-700'
            )}
          >
            {isIncoming ? <IconArrowDownLeft size={18} /> : <IconArrowUpRight size={18} />}
          </span>
          {!isOpen ? <span className="ml-3">{parsedContent.sliced}</span> : null}
          {isOpen ? <span className="ml-3 text-xs font-bold">{dataType}</span> : null}
        </div>
        <div className="flex gap-2">
          {message.timestamp && (
            <span className="text-xs text-gray-400">{new Date(message.timestamp).toISOString()}</span>
          )}
          <span className="text-gray-600">
            {isOpen ? (
              <IconChevronDown size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
            ) : (
              <IconChevronUp size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
            )}
          </span>
        </div>
      </div>
      {isOpen && (
        <div className="mt-2 h-[300px]">
          <CodeEditor
            mode={parsedContent.type}
            theme={displayedTheme}
            font={preferences.codeFont || 'default'}
            value={parsedContent.content}
          />
        </div>
      )}
    </div>
  );
};

const WSMessagesList = ({ messages = [] }) => {
  if (!messages.length) {
    return <div className="p-4 text-gray-500">No messages yet.</div>;
  }

  return (
    <StyledWrapper className="ws-messages-list flex flex-col gap-2 mt-4">
      {messages.map((msg, idx,src) => {
        const isLast = idx === src.length-1
        return <WSMessageItem id={idx} message={msg} defaultOpen={isLast} />;
      })}
    </StyledWrapper>
  );
};

export default WSMessagesList;
