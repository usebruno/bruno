import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateRequestBody } from 'providers/ReduxStore/slices/collections/index';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { sendGrpcMessage, generateGrpcSampleMessage } from 'utils/network/index';

import CodeEditor from 'components/CodeEditor/index';
import StyledWrapper from './StyledWrapper';
import { IconSend, IconRefresh, IconArrowRight, IconWand, IconPlus, IconTrash } from '@tabler/icons';
import ToolHint from 'components/ToolHint/index';
import { toastError, toastSuccess } from 'utils/common/error';
import { format, applyEdits } from 'jsonc-parser';

const SingleGrpcMessage = ({ message, item, collection, index, methodType}) => {
    const dispatch = useDispatch();
    const { displayedTheme, theme } = useTheme();
    const preferences = useSelector((state) => state.app.preferences);
    const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
    const isConnectionActive = useSelector((state) => state.collections.activeConnections.has(item.uid));

    // Check if this is a client streaming method (where client can send messages)
    console.log('>>> methodType', methodType);
    const canClientStream = methodType === 'CLIENT-STREAMING' || methodType === 'BIDI-STREAMING';

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
    <StyledWrapper>
      <div className="grpc-message-header flex items-center justify-between px-3 py-2 rounded-t-md bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center">
          <span className="font-medium text-sm">Message {index + 1}</span>
        </div>
        <div className="flex items-center gap-2">
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
      <div className="w-full min-h-40 border border-t-0 border-neutral-200 dark:border-neutral-800 rounded-b-md">
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
    </StyledWrapper>
    )
}

const GrpcBody = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  
  // Get the method type to determine if client can send multiple messages
  const methodType = item.draft ? get(item, 'draft.request.methodType') : get(item, 'request.methodType');
  console.log('>>> methodType body', methodType);
  // Check if this is a client streaming method (where client can send multiple messages)
  const canClientSendMultipleMessages = methodType === 'CLIENT-STREAMING' || methodType === 'BIDI-STREAMING';
  
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
      <div className="flex flex-col gap-4">
        {body.grpc.map((message, index) => (
          <SingleGrpcMessage 
            key={index}
            message={message} 
            item={item} 
            collection={collection}
            index={index}
            methodType={methodType}
          />
        ))}
      </div>
      
      {/* Only show add message button for client streaming or bidirectional methods */}
      {canClientSendMultipleMessages && (
        <ToolHint text="Add a new gRPC message to the request" toolhintId="add-msg">
          <button 
            onClick={addNewMessage}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-4 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
          >
            <IconPlus size={16} strokeWidth={1.5} className="text-neutral-700 dark:text-neutral-300" />
            <span className="font-medium text-sm text-neutral-700 dark:text-neutral-300">Add Message</span>
          </button>
        </ToolHint>
      )}
    </StyledWrapper>
  );
};

export default GrpcBody;