import React from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import { IconChevronUp, IconInfoCircle, IconChevronDown, IconArrowUpRight, IconArrowDownLeft } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor/index';
import { useTheme } from 'providers/Theme';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import { forwardRef } from 'react';

const getContentMeta = (content) => {
  if (typeof content === 'object') {
    return {
      isJSON: true,
      content: JSON.stringify(content, null, 0)
    };
  }
  try {
    return {
      isJSON: true,
      content: JSON.stringify(JSON.parse(content), null, 0)
    };
  } catch {
    return {
      isJSON: false,
      content: content
    };
  }
};

const parseContent = (content) => {
  let contentMeta = getContentMeta(content);
  return {
    type: contentMeta.isJSON ? 'application/json' : 'text/plain',
    content: contentMeta.isJSON ? JSON.stringify(JSON.parse(contentMeta.content), null, 2) : contentMeta.content,
  };
};

const getDataTypeText = (type) => {
  const textMap = {
    'text/plain': 'RAW',
    'application/json': 'JSON'
  };
  return textMap[type] ?? 'RAW';
};

/**
 * 
 * @param {"incoming"|"outgoing"|"info"} type 
 */
const TypeIcon = ({type})=>{
  const commonProps = {
    size: 18
  }
  return {
    "incoming": <IconArrowDownLeft {...commonProps} />,
    "outgoing": <IconArrowUpRight {...commonProps} />,
    "info": <IconInfoCircle {...commonProps} />
  }[type]
}

const WSMessageItem = ({ message, isLast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const preferences = useSelector((state) => state.app.preferences);

  const { displayedTheme } = useTheme();

  const isIncoming = message.type === 'incoming';
  const isInfo = message.type === 'info';
  let parsedContent = parseContent(message.message);
  const dataType = getDataTypeText(parsedContent.type);

  return (
    <div
      ref={(node) => {
        if (!node) return;
        if (isLast) node.scrollIntoView();
      }}
      className={classnames('ws-message flex flex-col py-2', {
        'ws-incoming': isIncoming,
        'ws-outgoing': !isIncoming,
        'open': isOpen
      })}
    >
      <div
        className={
          classnames("flex items-center justify-between",{
            "cursor-pointer": !isInfo,
            "cursor-not-allowed": isInfo
          })
        }
        onClick={(e) => {
          if(isInfo) return 
          setIsOpen(!isOpen);
        }}
      >
        <div className="flex min-w-0 shrink">
          <span
            className={classnames(
              'font-semibold flex items-center gap-1',
              isIncoming ? 'text-blue-700' : 'text-green-700'
            )}
          >
            <TypeIcon type={message.type} />
          </span>
          <span className="ml-3 text-ellipsis max-w-full overflow-hidden text-nowrap">{parsedContent.content}</span>
        </div>
        <div className="flex shrink-0 gap-2">
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
        <div className="mt-2 h-[300px] w-full">
          <div className="flex">
            <div className="flex-grow"></div>
            {isOpen ? <span className="text-xs mr-1 font-bold">{dataType}</span> : null}
          </div>
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

const WSMessagesList = ({ order = -1, messages = [] }) => {
  if (!messages.length) {
    return <div className="p-4 text-gray-500">No messages yet.</div>;
  }

  return (
    <StyledWrapper className="ws-messages-list flex flex-col gap-1 mt-4">
      {messages
        .toSorted((x, y) => {
          let a = order == -1 ? x : y
          let b = order == -1 ? y : x
          return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        })
        .map((msg, idx, src) => {
          const isLast = src.length - 1 === idx;
          return <WSMessageItem isLast={isLast} id={idx} message={msg} />;
        })}
    </StyledWrapper>
  );
};

export default WSMessagesList;
