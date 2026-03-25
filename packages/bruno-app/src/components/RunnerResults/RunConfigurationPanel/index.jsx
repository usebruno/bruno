import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { IconGripVertical, IconCheck } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { updateRunnerConfiguration } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { isItemARequest } from 'utils/collections';
import path from 'utils/common/path';
import { cloneDeep, get } from 'lodash';
import Button from 'ui/Button/index';
import { isRequestTagsIncluded } from '@usebruno/common';

const isRequestDisabled = (item, tags) => {
  // WS and gRPC are not supported by the collection runner
  if (item.type === 'ws-request' || item.type === 'grpc-request') return true;

  // Check tag filtering
  const requestTags = item.draft?.tags || item.tags || [];
  const includeTags = tags?.include || [];
  const excludeTags = tags?.exclude || [];

  if (includeTags.length > 0 || excludeTags.length > 0) {
    return !isRequestTagsIncluded(requestTags, includeTags, excludeTags);
  }

  return false;
};

const ItemTypes = {
  REQUEST_ITEM: 'request-item'
};

const getMethodInfo = (item) => {
  const isGrpc = item.type === 'grpc-request';
  const isWS = item.type === 'ws-request';
  const isGraphQL = item.type === 'graphql-request';

  let methodText;
  let methodClass;

  if (isGrpc) {
    methodText = 'GRPC';
    methodClass = 'method-grpc';
  } else if (isWS) {
    methodText = 'WS';
    methodClass = 'method-ws';
  } else if (isGraphQL) {
    methodText = 'GQL';
    methodClass = 'method-gql';
  } else {
    const method = item.request?.method || '';
    methodText = method.length > 5 ? method.substring(0, 3).toUpperCase() : method.toUpperCase();
    methodClass = `method-${method.toLowerCase()}`;
  }

  return { methodText, methodClass };
};

const RequestItem = ({ item, index, moveItem, isSelected, onSelect, onDrop, isDisabled }) => {
  const ref = useRef(null);
  const [dropType, setDropType] = useState(null);

  const determineDropType = (monitor) => {
    const hoverBoundingRect = ref.current?.getBoundingClientRect();
    const clientOffset = monitor.getClientOffset();
    if (!hoverBoundingRect || !clientOffset) return null;

    const clientY = clientOffset.y - hoverBoundingRect.top;
    const middleY = hoverBoundingRect.height / 2;

    return clientY < middleY ? 'above' : 'below';
  };

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.REQUEST_ITEM,
    item: { uid: item.uid, name: item.name, request: item.request, index },
    canDrag: !isDisabled,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    options: {
      dropEffect: 'move'
    },
    end: (draggedItem, monitor) => {
      if (monitor.didDrop()) {
        onDrop();
      }
    }
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.REQUEST_ITEM,
    hover: (draggedItem, monitor) => {
      if (draggedItem.uid === item.uid) {
        setDropType(null);
        return;
      }

      const dropType = determineDropType(monitor);
      setDropType(dropType);
    },
    drop: (draggedItem, monitor) => {
      if (draggedItem.uid === item.uid) return;

      const dropType = determineDropType(monitor);
      let targetIndex = index;

      if (dropType === 'below') {
        targetIndex = index + 1;
      }

      if (draggedItem.index < targetIndex) {
        targetIndex = targetIndex - 1;
      }

      moveItem(draggedItem.uid, targetIndex);
      setDropType(null);
      return { item: draggedItem };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, []);

  // Clear drop type when not hovering
  useEffect(() => {
    if (!isOver) {
      setDropType(null);
    }
  }, [isOver]);

  drag(drop(ref));

  const methodInfo = getMethodInfo(item);
  const itemClasses = [
    'request-item',
    isDragging ? 'is-dragging' : '',
    isSelected ? 'is-selected' : '',
    isDisabled ? 'is-disabled' : '',
    isOver && canDrop && dropType === 'above' ? 'drop-target-above' : '',
    isOver && canDrop && dropType === 'below' ? 'drop-target-below' : ''
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={itemClasses} data-testid="runner-request-item">
      <div className="drag-handle">
        <IconGripVertical size={16} strokeWidth={1.5} />
      </div>

      <div className="checkbox-container" onClick={() => !isDisabled && onSelect(item)}>
        <div className="checkbox">
          {isSelected && !isDisabled && <IconCheck className="checkbox-icon" size={12} strokeWidth={3} />}
        </div>
      </div>

      <div className={`method ${methodInfo.methodClass}`}>
        {methodInfo.methodText}
      </div>

      <div className="request-name">
        <span>{item.name}</span>
        {item.folderPath && (
          <span className="folder-path">{item.folderPath}</span>
        )}
      </div>
    </div>
  );
};

const RunConfigurationPanel = ({ collection, selectedItems, setSelectedItems, tags }) => {
  const dispatch = useDispatch();
  const [flattenedRequests, setFlattenedRequests] = useState([]);
  const [originalRequests, setOriginalRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // On first mount, ignore any stale saved config and auto-select all items
  const isInitialMountRef = useRef(true);
  // Track items that were auto-deselected due to tag filters, so we can re-select them when tags change back
  const pendingReselectRef = useRef(new Set());

  const flattenRequests = useCallback((collection) => {
    const result = [];

    const processItems = (items) => {
      if (!items?.length) return;

      items.forEach((item) => {
        if (isItemARequest(item) && !item.partial && !item.isTransient) {
          const relativePath = path.relative(collection.pathname, path.dirname(item.pathname));
          const folderPath = relativePath !== '.' ? relativePath : '';

          result.push({
            ...item,
            folderPath: folderPath.replace(/\\/g, '/')
          });
        }

        if (item.items?.length) {
          processItems(item.items);
        }
      });
    };

    processItems(collection.items);
    return result;
  }, []);

  useEffect(() => {
    setIsLoading(true);

    try {
      const structureCopy = cloneDeep(collection);
      const requests = flattenRequests(structureCopy);

      const savedConfiguration = get(collection, 'runnerConfiguration', null);
      let finalRequests;
      if (savedConfiguration?.requestItemsOrder?.length > 0) {
        const orderedRequests = [];
        const requestMap = new Map(requests.map((req) => [req.uid, req]));

        savedConfiguration.requestItemsOrder.forEach((uid) => {
          const request = requestMap.get(uid);
          if (request) {
            orderedRequests.push(request);
            requestMap.delete(uid);
          }
        });

        requestMap.forEach((request) => {
          orderedRequests.push(request);
        });

        finalRequests = orderedRequests;
      } else {
        finalRequests = requests;
      }

      setFlattenedRequests(finalRequests);
      setOriginalRequests(cloneDeep(requests));

      if (!savedConfiguration || isInitialMountRef.current) {
        isInitialMountRef.current = false;
        const enabledUids = finalRequests
          .filter((item) => !isRequestDisabled(item, tags))
          .map((item) => item.uid);
        setSelectedItems(enabledUids);
      }
    } catch (error) {
      console.error('Error loading collection structure:', error);
    } finally {
      setIsLoading(false);
    }
  }, [collection, flattenRequests]);

  // When tags change: disable newly-filtered items, re-select previously-filtered items that are now enabled again
  useEffect(() => {
    if (flattenedRequests.length === 0) return;

    let newSelected = [...selectedItems];
    let changed = false;

    flattenedRequests.forEach((item) => {
      const disabled = isRequestDisabled(item, tags);
      const isCurrentlySelected = selectedItems.includes(item.uid);
      const isPendingReselect = pendingReselectRef.current.has(item.uid);

      if (disabled && isCurrentlySelected) {
        pendingReselectRef.current.add(item.uid);
        newSelected = newSelected.filter((uid) => uid !== item.uid);
        changed = true;
      } else if (!disabled && isPendingReselect) {
        pendingReselectRef.current.delete(item.uid);
        if (!newSelected.includes(item.uid)) {
          newSelected.push(item.uid);
          changed = true;
        }
      }
    });

    if (changed) {
      const ordered = flattenedRequests
        .filter((r) => newSelected.includes(r.uid))
        .map((r) => r.uid);
      setSelectedItems(ordered);
      const allRequestUidsOrder = flattenedRequests.map((item) => item.uid);
      dispatch(updateRunnerConfiguration(collection.uid, ordered, allRequestUidsOrder));
    }
  }, [tags, flattenedRequests]);

  const enabledRequests = flattenedRequests.filter((item) => !isRequestDisabled(item, tags));
  const enabledCount = enabledRequests.length;

  const moveItem = useCallback((draggedItemUid, hoverIndex) => {
    setFlattenedRequests((prevRequests) => {
      const dragIndex = prevRequests.findIndex((item) => item.uid === draggedItemUid);

      if (dragIndex === -1 || dragIndex === hoverIndex) {
        return prevRequests;
      }

      const updatedRequests = [...prevRequests];
      const [draggedItem] = updatedRequests.splice(dragIndex, 1);
      updatedRequests.splice(hoverIndex, 0, draggedItem);

      return updatedRequests;
    });
  }, []);

  const handleDrop = useCallback(() => {
    const selectedUids = new Set(selectedItems);

    setFlattenedRequests((currentRequests) => {
      const newOrderedSelectedUids = currentRequests
        .filter((item) => selectedUids.has(item.uid))
        .map((item) => item.uid);

      const allRequestUidsOrder = currentRequests.map((item) => item.uid);

      setSelectedItems(newOrderedSelectedUids);
      dispatch(updateRunnerConfiguration(collection.uid, newOrderedSelectedUids, allRequestUidsOrder));

      return currentRequests;
    });
  }, [selectedItems, collection.uid, dispatch, setSelectedItems]);

  const handleRequestSelect = useCallback((item) => {
    if (isRequestDisabled(item, tags)) return;

    try {
      if (selectedItems.includes(item.uid)) {
        const newSelectedUids = selectedItems.filter((uid) => uid !== item.uid);
        setSelectedItems(newSelectedUids);

        const allRequestUidsOrder = flattenedRequests.map((item) => item.uid);
        dispatch(updateRunnerConfiguration(collection.uid, newSelectedUids, allRequestUidsOrder));
      } else {
        const newSelectedUids = [...selectedItems, item.uid];

        const orderedSelectedUids = flattenedRequests
          .filter((req) => newSelectedUids.includes(req.uid))
          .map((req) => req.uid);

        setSelectedItems(orderedSelectedUids);

        const allRequestUidsOrder = flattenedRequests.map((item) => item.uid);
        dispatch(updateRunnerConfiguration(collection.uid, orderedSelectedUids, allRequestUidsOrder));
      }
    } catch (error) {
      console.error('Error selecting item:', error);
    }
  }, [selectedItems, setSelectedItems, flattenedRequests, dispatch, collection.uid, tags]);

  const handleSelectAll = useCallback(() => {
    try {
      const allRequestUidsOrder = flattenedRequests.map((item) => item.uid);
      const enabledUids = enabledRequests.map((item) => item.uid);

      if (selectedItems.length === enabledCount) {
        pendingReselectRef.current.clear();
        setSelectedItems([]);
        dispatch(updateRunnerConfiguration(collection.uid, [], allRequestUidsOrder));
      } else {
        setSelectedItems(enabledUids);
        dispatch(updateRunnerConfiguration(collection.uid, enabledUids, allRequestUidsOrder));
      }
    } catch (error) {
      console.error('Error selecting/deselecting all items:', error);
    }
  }, [flattenedRequests, enabledRequests, enabledCount, selectedItems, setSelectedItems, dispatch, collection.uid]);

  const handleReset = useCallback(() => {
    try {
      pendingReselectRef.current.clear();
      const resetRequests = cloneDeep(originalRequests);
      setFlattenedRequests(resetRequests);
      const enabledUids = resetRequests
        .filter((item) => !isRequestDisabled(item, tags))
        .map((item) => item.uid);
      setSelectedItems(enabledUids);
      const allUidsOrder = resetRequests.map((item) => item.uid);
      dispatch(updateRunnerConfiguration(collection.uid, enabledUids, allUidsOrder));
    } catch (error) {
      console.error('Error resetting configuration:', error);
    }
  }, [originalRequests, setSelectedItems, collection.uid, dispatch, tags]);

  return (
    <StyledWrapper data-testid="runner-config-panel">
      <div className="header">
        <div className="counter" data-testid="runner-config-counter">
          {selectedItems.length} of {enabledCount} selected
        </div>
        <div className="actions">
          <Button
            variant="ghost"
            onClick={handleSelectAll}
            data-testid="runner-select-all"
          >
            {selectedItems.length === enabledCount ? 'Deselect All' : 'Select All'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleReset}
            title="Reset selection and order"
            data-testid="runner-config-reset"
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="request-list">
        {isLoading ? (
          <div className="loading-message">Loading requests...</div>
        ) : flattenedRequests.length === 0 ? (
          <div className="empty-message">No requests found in this collection</div>
        ) : (
          <div className="requests-container">
            {flattenedRequests.map((item, idx) => {
              const isSelected = selectedItems.includes(item.uid);
              const disabled = isRequestDisabled(item, tags);

              return (
                <RequestItem
                  key={item.uid}
                  item={item}
                  index={idx}
                  isSelected={isSelected}
                  isDisabled={disabled}
                  onSelect={() => handleRequestSelect(item)}
                  moveItem={moveItem}
                  onDrop={handleDrop}
                />
              );
            })}
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default RunConfigurationPanel;
