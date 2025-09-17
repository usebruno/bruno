import React from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import { IconChevronUp, IconInfoCircle, IconChevronDown, IconArrowUpRight, IconArrowDownLeft } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor/index';
import { useTheme } from 'providers/Theme';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import _ from 'lodash';
import { useRef } from 'react';
import { useEffect } from 'react';

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

const WSMessageItem = ({ message, inFocus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const preferences = useSelector((state) => state.app.preferences);
  const { displayedTheme } = useTheme();
  const [isNew, setIsNew] = useState(false)
  const notified = useRef(false)

  const isIncoming = message.type === 'incoming';
  const isInfo = message.type === 'info';
  let parsedContent = parseContent(message.message);
  const dataType = getDataTypeText(parsedContent.type);

  useEffect(()=>{
    if(notified.current === true) return 
    const dateDiff = Date.now() - new Date(message.timestamp).getTime()
    if(dateDiff < 1000 * 10){
      setIsNew(true)
      setTimeout(()=>{
        notified.current = true
        setIsNew(false)
      },2500)
    }
  }, [message])


  return (
    <div
      ref={(node) => {
        if (!node) return;
        if (inFocus) node.scrollIntoView()
      }}
      className={classnames('ws-message flex flex-col p-2', {
        'ws-incoming': isIncoming,
        'ws-outgoing': !isIncoming,
        'open': isOpen,
        'new': isNew
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
          {!isInfo && <span className="text-gray-600">
            {isOpen? (
              <IconChevronDown size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
            ) : (
              <IconChevronUp size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
            )}
          </span>}
        </div>
      </div>
      {isOpen && (
        <div className="my-2 relative h-[300px] w-full">
          <CodeEditor
            mode={parsedContent.type}
            theme={displayedTheme}
            font={preferences.codeFont || 'default'}
            value={parsedContent.content}
          />
          <div className="absolute top-1 right-1 p-1 rounded-sm">
            {isOpen ? <span className="text-xs mr-1 font-bold">{dataType}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
};

const WSMessagesList = ({ order = -1, messages = [] }) => {
  if (!messages.length) {
    return <div className="p-4 text-gray-500">No messages yet.</div>;
  }
  const ordered = order === -1 ? messages : messages.slice().reverse()
  return (
    <StyledWrapper className="ws-messages-list flex flex-col">
      {ordered
        .map((msg, idx, src) => {
          const inFocus = order === -1 ? src.length - 1 === idx : idx === 0;
          return <WSMessageItem inFocus={inFocus} id={idx} message={msg} />;
        })}
    </StyledWrapper>
  );
};

export default WSMessagesList;
