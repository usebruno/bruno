import React, { useState, useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections/index';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { sendGrpcMessage, generateGrpcSampleMessage } from 'utils/network/index';
import toast from 'react-hot-toast';

import CodeEditor from 'components/CodeEditor/index';
import StyledWrapper from './StyledWrapper';
import { IconSend, IconRefresh, IconWand, IconPlus, IconTrash, IconChevronDown, IconChevronUp } from '@tabler/icons';
import ToolHint from 'components/ToolHint/index';
import { toastError, toastSuccess } from 'utils/common/error';
import { format, applyEdits } from 'jsonc-parser';
import ScrollIndicator from 'components/ScrollIndicator';

const SingleGrpcMessage = ({ message, item, collection, index, methodType, isCollapsed, onToggleCollapse, handleRun }) => {
    const dispatch = useDispatch();
    const { displayedTheme, theme } = useTheme();
    const preferences = useSelector((state) => state.app.preferences);
    const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
    const isConnectionActive = useSelector((state) => state.collections.activeConnections.includes(item.uid));

    const canClientStream = methodType === 'client-streaming' || methodType === 'bidi-streaming';

    const { name, content } = message;

    const onEdit = (value) => {
        const currentMessages = [...(body.grpc || [])];
        
        currentMessages[index] = {
            name: name ? name : `message ${index + 1}`,
            content: value
        };
            
        dispatch(
            updateRequestBody({
                content: currentMessages,
                itemUid: item.uid,
                collectionUid: collection.uid
            })
        );
    };
    
    const onSend = () => {
      try {
        dispatch(sendGrpcMessage(item, collection.uid, content))
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
    const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
    
    const onRegenerateMessage = async () => {
        try {
            const loadingToastId = toastSuccess('Generating sample message...');
            
            const methodPath = item.draft?.request?.method || item.request?.method;
            
            if (!methodPath) {
                toastError(new Error('Method path not found in request'));
                return;
            }
            
            const result = await generateGrpcSampleMessage(
                methodPath,
                content, 
                { arraySize: 2 } 
            );
            
            if (result.success) {
                const currentMessages = [...(body.grpc || [])];
                
                currentMessages[index] = {
                    name: name ? name : `message ${index + 1}`,
                    content: result.message
                };
                
                dispatch(
                    updateRequestBody({
                        content: currentMessages,
                        itemUid: item.uid,
                        collectionUid: collection.uid
                    })
                );
                
                toastSuccess('Sample message generated successfully!', { id: loadingToastId });
            } else {
                toastError(new Error(result.error || 'Failed to generate sample message'));
            }
        } catch (error) {
            console.error('Error generating sample message:', error);
            toastError(error);
        }
    };

    const onDeleteMessage = () => { 
        const currentMessages = [...(body.grpc || [])];
        
        currentMessages.splice(index, 1);
        
        dispatch(
            updateRequestBody({
                content: currentMessages,
                itemUid: item.uid,
                collectionUid: collection.uid
            })
        );
    };

    const onPrettify = () => {
      try {
        const edits = format(content, undefined, { tabSize: 2, insertSpaces: true });
        const prettyBodyJson = applyEdits(content, edits);

        const currentMessages = [...(body.grpc || [])];
        currentMessages[index] = {
            name: name ? name : `message ${index + 1}`,
            content: prettyBodyJson
        };
        dispatch(
          updateRequestBody({
            content: currentMessages,
            itemUid: item.uid,
            collectionUid: collection.uid
          })
        );
      } catch (e) {
        toastError(new Error('Unable to prettify. Invalid JSON format.'));
      }
    };

    return (
    <div className="flex flex-col mb-3 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden">
      <div 
        className="grpc-message-header flex items-center justify-between px-3 py-2 bg-neutral-100 dark:bg-neutral-700 cursor-pointer"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? 
            <IconChevronDown size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" /> : 
            <IconChevronUp size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
          }
          <span className="font-medium text-sm">{`Message ${canClientStream ? index + 1 : ''}`}</span>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <ToolHint text="Format JSON with proper indentation and spacing" toolhintId={`prettify-msg-${index}`}>
            <button 
              onClick={onPrettify}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            >
              <IconWand size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
            </button>
          </ToolHint>
          
          <ToolHint text="Generate a new sample message based on schema" toolhintId={`regenerate-msg-${index}`}>
            <button 
              onClick={onRegenerateMessage}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            >
              <IconRefresh size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
            </button>
          </ToolHint>
          
          {canClientStream && (
            <ToolHint text={isConnectionActive ? "Send gRPC message" : "Connection not active"} toolhintId={`send-msg-${index}`}>
              <button 
                onClick={onSend}
                disabled={!isConnectionActive}
                className={`p-1 rounded ${isConnectionActive ? 'hover:bg-zinc-200 dark:hover:bg-zinc-600' : 'opacity-50 cursor-not-allowed'} transition-colors`}
              >
                <IconSend 
                  size={16} 
                  strokeWidth={1.5} 
                  className={`${isConnectionActive ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-500'}`} 
                />
              </button>
            </ToolHint>
          )}
          
          {index > 0 && (
            <ToolHint text="Delete this message" toolhintId={`delete-msg-${index}`}>
              <button 
                onClick={onDeleteMessage}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                <IconTrash size={16} strokeWidth={1.5} className="text-zinc-700 dark:text-zinc-300" />
              </button>
            </ToolHint>
          )}
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="flex h-60 relative">
          <CodeEditor
            collection={collection} 
            theme={displayedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            value={content}
            onEdit={onEdit}
            onRun={handleRun}
            onSave={onSave}
            mode='application/ld+json'
            enableVariableHighlighting={true}
          />
        </div>
      )}
    </div>
    )
}

const GrpcBody = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [collapsedMessages, setCollapsedMessages] = useState([]);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const messagesContainerRef = useRef(null);
  
  const methodType = item.draft ? get(item, 'draft.request.methodType') : get(item, 'request.methodType');
  const canClientSendMultipleMessages = methodType === 'client-streaming' || methodType === 'bidi-streaming';
  
  const toggleMessageCollapse = (index) => {
    setCollapsedMessages(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };
  
  const addNewMessage = () => {
    const currentMessages = Array.isArray(body.grpc) 
        ? [...body.grpc] 
        : [];
    
    currentMessages.push({
      name: `message ${currentMessages.length + 1}`,
      content: '{}'
    });
    
    dispatch(
        updateRequestBody({
            content: currentMessages,
            itemUid: item.uid,
            collectionUid: collection.uid
        })
    );
    
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const { scrollHeight } = messagesContainerRef.current;
        messagesContainerRef.current.scrollTop = scrollHeight;
      }
    }, 100);
  };


  if (!body?.grpc || !Array.isArray(body.grpc)) {
    return (
      <StyledWrapper>
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">No gRPC messages available</p>
          <ToolHint text="Add the first message to your gRPC request" toolhintId="add-first-msg">
            <button 
              onClick={addNewMessage}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              <IconPlus size={16} strokeWidth={1.5} className="text-neutral-700 dark:text-neutral-300" />
              <span className="font-medium text-sm text-neutral-700 dark:text-neutral-300">Add First Message</span>
            </button>
          </ToolHint>
        </div>
      </StyledWrapper>
    );
  }
  
  return (
    <StyledWrapper>
      <div 
        id="grpc-messages-container" 
        className="flex-1 pb-16"
        ref={messagesContainerRef}
      >
        {body.grpc
          .filter((_, index) => canClientSendMultipleMessages || index === 0)
          .map((message, index) => (
          <SingleGrpcMessage 
            key={index}
            message={message} 
            item={item} 
            collection={collection}
            index={index}
            methodType={methodType}
            isCollapsed={collapsedMessages.includes(index)}
            onToggleCollapse={() => toggleMessageCollapse(index)}
            handleRun={handleRun}
          />
        ))}
      </div>
      
      <ScrollIndicator 
        containerRef={messagesContainerRef} 
        dependencies={[body?.grpc, collapsedMessages]} 
      />
      
      {canClientSendMultipleMessages && (
        <div className="add-message-btn-container">
          <ToolHint text="Add a new gRPC message to the request" toolhintId="add-msg-fixed">
            <button 
              onClick={addNewMessage}
              className="add-message-btn flex items-center justify-center gap-2 py-2 px-4 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors shadow-md"
            >
              <IconPlus size={16} strokeWidth={1.5} className="text-neutral-700 dark:text-neutral-300" />
              <span className="font-medium text-sm text-neutral-700 dark:text-neutral-300">Add Message</span>
            </button>
          </ToolHint>
        </div>
      )}
    </StyledWrapper>
  );
};

export default GrpcBody;