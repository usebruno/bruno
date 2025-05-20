import React, { useState, useRef, useEffect } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections/index';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { sendGrpcMessage, generateGrpcSampleMessage } from 'utils/network/index';

import CodeEditor from 'components/CodeEditor/index';
import StyledWrapper from './StyledWrapper';
import { IconSend, IconRefresh, IconWand, IconPlus, IconTrash, IconChevronDown, IconChevronUp } from '@tabler/icons';
import ToolHint from 'components/ToolHint/index';
import { toastError, toastSuccess } from 'utils/common/error';
import { format, applyEdits } from 'jsonc-parser';

// Animated mouse icon with scrolling wheel animation
const AnimatedMouseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="animated-mouse-icon"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M6 3m0 4a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-4a4 4 0 0 1 -4 -4z" />
    <path className="scroll-wheel-animation" d="M12 7l0 4" />
  </svg>
);

const SingleGrpcMessage = ({ message, item, collection, index, methodType, isCollapsed, onToggleCollapse }) => {
    const dispatch = useDispatch();
    const { displayedTheme, theme } = useTheme();
    const preferences = useSelector((state) => state.app.preferences);
    const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
    const isConnectionActive = useSelector((state) => state.collections.activeConnections.has(item.uid));

    // Check if this is a client streaming method (where client can send messages)
    const canClientStream = methodType === 'client-streaming' || methodType === 'bidi-streaming';

    // Ensure message is a string, since CodeEditor expects a string value
    const { name, content } = message;
    // console.log('>>> message', message);

    const onEdit = (value) => {
        // Get current messages array
        const currentMessages = [...(body.grpc || [])];
        
        // Store value as string - the editor returns a string
        currentMessages[index] = {
            name: name ? name : `message ${index + 1}`,
            content: value
        };
            
        // Dispatch the updated array of messages
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
            // Show a loading message
            const loadingToastId = toastSuccess('Generating sample message...');
            
            // Get the method path from the item
            const methodPath = item.draft?.request?.method || item.request?.method;
            
            if (!methodPath) {
                toastError(new Error('Method path not found in request'));
                return;
            }
            
            console.log(`Regenerating message for ${item.name}, method path: ${methodPath}`);
            
            // Call our new function to generate a sample message
            const result = await generateGrpcSampleMessage(
                methodPath,
                content, // Pass the current content as a template
                { arraySize: 2 } // Options for generation
            );
            
            if (result.success) {
                // Get current messages array
                const currentMessages = [...(body.grpc || [])];
                
                // Update this message with the generated sample
                currentMessages[index] = {
                    name: name ? name : `message ${index + 1}`,
                    content: result.message
                };
                
                // Dispatch the updated array of messages
                dispatch(
                    updateRequestBody({
                        content: currentMessages,
                        itemUid: item.uid,
                        collectionUid: collection.uid
                    })
                );
                
                // Show success message
                toastSuccess('Sample message generated successfully!', { id: loadingToastId });
            } else {
                // Show error message
                toastError(new Error(result.error || 'Failed to generate sample message'));
            }
        } catch (error) {
            console.error('Error generating sample message:', error);
            toastError(error);
        }
    };

    const onDeleteMessage = () => {
        // Get current messages array
        const currentMessages = [...(body.grpc || [])];
        
        // Remove message at the specified index
        currentMessages.splice(index, 1);
        
        // Dispatch the updated array of messages
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
          <span className="font-medium text-sm">Message {index + 1}</span>
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
            theme={displayedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            value={content}
            onEdit={onEdit}
            onRun={onSend}
            onSave={onSave}
            mode='application/ld+json'
          />
        </div>
      )}
    </div>
    )
}

const GrpcBody = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [collapsedMessages, setCollapsedMessages] = useState([]);
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const messagesContainerRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  
  // Get the method type to determine if client can send multiple messages
  const methodType = item.draft ? get(item, 'draft.request.methodType') : get(item, 'request.methodType');
  // Check if this is a client streaming method (where client can send multiple messages)
  const canClientSendMultipleMessages = methodType === 'client-streaming' || methodType === 'bidi-streaming';
  
  // Check for overflow when messages change
  useEffect(() => {
    const checkForOverflow = () => {
      if (messagesContainerRef.current) {
        const { scrollHeight, clientHeight } = messagesContainerRef.current;
        const hasContentOverflow = scrollHeight > clientHeight;
        setHasOverflow(hasContentOverflow);
        
        // If there's overflow, also check if we're scrolled to the bottom
        if (hasContentOverflow) {
          checkScrollPosition();
        }
      }
    };
    
    const checkScrollPosition = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        // Consider scrolled to bottom if within 20px of the actual bottom
        const isBottom = scrollHeight - scrollTop - clientHeight < 20;
        setIsScrolledToBottom(isBottom);
      }
    };
    
    // Add scroll event listener
    const handleScroll = () => {
      checkScrollPosition();
    };
    
    checkForOverflow();
    
    // Add event listeners
    const containerElement = messagesContainerRef.current;
    if (containerElement) {
      containerElement.addEventListener('scroll', handleScroll);
    }
    
    window.addEventListener('resize', checkForOverflow);
    
    return () => {
      window.removeEventListener('resize', checkForOverflow);
      if (containerElement) {
        containerElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [body?.grpc, collapsedMessages]);
  
  const toggleMessageCollapse = (index) => {
    setCollapsedMessages(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
    
    // Check for overflow after a small delay to allow the collapse animation to complete
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const { scrollHeight, clientHeight } = messagesContainerRef.current;
        setHasOverflow(scrollHeight > clientHeight);
      }
    }, 50);
  };
  
  const addNewMessage = () => {
    // Get current messages array or initialize empty array
    const currentMessages = Array.isArray(body.grpc) 
        ? [...body.grpc] 
        : [];
    
    // Add a new empty message as a stringified empty JSON object
    currentMessages.push({
      name: `message ${currentMessages.length + 1}`,
      content: '{}'
    });
    
    // Dispatch update with the new array
    dispatch(
        updateRequestBody({
            content: currentMessages,
            itemUid: item.uid,
            collectionUid: collection.uid
        })
    );
    
    // Check for overflow after a small delay to allow the DOM to update
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = messagesContainerRef.current;
        const hasContentOverflow = scrollHeight > clientHeight;
        setHasOverflow(hasContentOverflow);
        
        // Also check if we're scrolled to the bottom
        if (hasContentOverflow) {
          const isBottom = scrollHeight - scrollTop - clientHeight < 20;
          setIsScrolledToBottom(isBottom);
        }
        
        // If we added a new message, auto-scroll to bottom
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
      {/* Messages container with space at bottom for fixed button */}
      <div 
        id="grpc-messages-container" 
        className="flex-1 pb-16"
        ref={messagesContainerRef}
      >
        {body.grpc.map((message, index) => (
          <SingleGrpcMessage 
            key={index}
            message={message} 
            item={item} 
            collection={collection}
            index={index}
            methodType={methodType}
            isCollapsed={collapsedMessages.includes(index)}
            onToggleCollapse={() => toggleMessageCollapse(index)}
          />
        ))}
      </div>
      
      {/* Fixed gradient scroll indicator - only show when there's overflow and not scrolled to bottom */}
      <div className={`scroll-indicator ${hasOverflow && !isScrolledToBottom ? 'visible' : ''}`}>
        <div className="chevron-container">
          <div className="mouse-scroll-indicator">
            <AnimatedMouseIcon />
          </div>
        </div>
      </div>
      
      {/* Absolutely positioned Add Message Button at the bottom */}
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