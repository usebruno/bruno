import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { IconGripVertical, IconCheck, IconAdjustmentsAlt } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { updateRunnerConfiguration } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { isItemARequest } from 'utils/collections';
import path from 'utils/common/path';
import { cloneDeep, get } from 'lodash';

const ItemTypes = {
  REQUEST_ITEM: 'request-item'
};

const RequestItem = ({ item, index, moveItem, isSelected, onSelect, onDrop }) => {
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
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    options: {
      dropEffect: "move"
    },
    end: (draggedItem, monitor) => {
      if (monitor.didDrop()) {
        onDrop();
      }
    },
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
    }),
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

  const itemClasses = [
    'request-item',
    isDragging ? 'is-dragging' : '',
    isSelected ? 'is-selected' : '',
    isOver && canDrop && dropType === 'above' ? 'drop-target-above' : '',
    isOver && canDrop && dropType === 'below' ? 'drop-target-below' : ''
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={itemClasses}>
      <div className="drag-handle">
        <IconGripVertical size={16} strokeWidth={1.5} />
      </div>

      <div className="checkbox-container" onClick={() => onSelect(item)}>
        <div className="checkbox">
          {isSelected && <IconCheck size={12} />}
        </div>
      </div>

      <div className={`method method-${item.request?.method.toLowerCase()}`}>
        {item.request?.method.toUpperCase()}
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

const RunConfigurationPanel = ({ collection, selectedItems, setSelectedItems }) => {
  const dispatch = useDispatch();
  const [flattenedRequests, setFlattenedRequests] = useState([]);
  const [originalRequests, setOriginalRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const flattenRequests = useCallback((collection) => {
    const result = [];

    const processItems = (items) => {
      if (!items?.length) return;

      items.forEach(item => {
        if (isItemARequest(item)) {
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
      if (savedConfiguration?.requestItemsOrder?.length > 0) {
        const orderedRequests = [];
        const requestMap = new Map(requests.map(req => [req.uid, req]));

        savedConfiguration.requestItemsOrder.forEach(uid => {
          const request = requestMap.get(uid);
          if (request) {
            orderedRequests.push(request);
            requestMap.delete(uid);
          }
        });

        requestMap.forEach(request => {
          orderedRequests.push(request);
        });

        setFlattenedRequests(orderedRequests);
      } else {
        setFlattenedRequests(requests);
      }

      setOriginalRequests(cloneDeep(requests));
    } catch (error) {
      console.error("Error loading collection structure:", error);
    } finally {
      setIsLoading(false);
    }
  }, [collection, flattenRequests]);

  const moveItem = useCallback((draggedItemUid, hoverIndex) => {
    setFlattenedRequests((prevRequests) => {
      const dragIndex = prevRequests.findIndex(item => item.uid === draggedItemUid);

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
    setFlattenedRequests(currentRequests => {
      const selectedUids = new Set(selectedItems.map(item => item.uid));

      const newOrderedSelectedItems = currentRequests
        .filter(item => selectedUids.has(item.uid))
        .map(item => {
          const originalSelectedItem = selectedItems.find(sel => sel.uid === item.uid);
          return originalSelectedItem || {
            uid: item.uid,
            displayName: item.name,
            name: item.name,
            pathname: item.pathname,
            type: item.type,
            filename: item.filename,
            folderPath: item.folderPath,
            request: { method: item.request?.method || 'GET' }
          };
        });

      setSelectedItems(newOrderedSelectedItems);

      const allRequestUidsOrder = currentRequests.map(item => item.uid);
      dispatch(updateRunnerConfiguration(collection.uid, newOrderedSelectedItems, allRequestUidsOrder));

      return currentRequests;
    });
  }, [selectedItems, collection.uid, dispatch, setSelectedItems]);

  const createSimplifiedItem = useCallback((item) => ({
    uid: item.uid,
    displayName: item.displayName || item.name,
    name: item.name,
    pathname: item.pathname,
    type: item.type,
    filename: item.filename,
    request: { method: item.request?.method || 'GET' },
    folderPath: item.folderPath
  }), []);

  const handleRequestSelect = useCallback((item) => {
    try {
      if (selectedItems.find(i => i.uid === item.uid)) {
        setSelectedItems(selectedItems.filter(i => i.uid !== item.uid));
      } else {
        const simplifiedItem = createSimplifiedItem(item);
        const newSelectedItems = [...selectedItems, simplifiedItem];

        const selectedUids = new Set(newSelectedItems.map(item => item.uid));
        const visuallyOrderedSelected = flattenedRequests
          .filter(item => selectedUids.has(item.uid))
          .map(item => newSelectedItems.find(sel => sel.uid === item.uid))
          .filter(Boolean);

        setSelectedItems(visuallyOrderedSelected);

        const allRequestUidsOrder = flattenedRequests.map(item => item.uid);
        dispatch(updateRunnerConfiguration(collection.uid, visuallyOrderedSelected, allRequestUidsOrder));
      }
    } catch (error) {
      console.error("Error selecting item:", error);
    }
  }, [selectedItems, setSelectedItems, flattenedRequests, dispatch, collection.uid, createSimplifiedItem]);

  const handleSelectAll = useCallback(() => {
    try {
      if (selectedItems.length === flattenedRequests.length) {
        setSelectedItems([]);
      } else {
        const simplifiedItems = flattenedRequests.map(createSimplifiedItem);
        setSelectedItems(simplifiedItems);
      }
    } catch (error) {
      console.error("Error selecting/deselecting all items:", error);
    }
  }, [flattenedRequests, selectedItems, setSelectedItems, createSimplifiedItem]);

  const handleReset = useCallback(() => {
    try {
      setFlattenedRequests(cloneDeep(originalRequests));
      setSelectedItems([]);
      dispatch(updateRunnerConfiguration(collection.uid, [], []));
    } catch (error) {
      console.error("Error resetting configuration:", error);
    }
  }, [originalRequests, setSelectedItems, collection.uid, dispatch]);

  return (
    <StyledWrapper>
      <div className="header">
        <div className="counter">
          {selectedItems.length} of {flattenedRequests.length} selected
        </div>
        <div className="actions">
          <button className="btn-select-all" onClick={handleSelectAll}>
            {selectedItems.length === flattenedRequests.length ? "Deselect All" : "Select All"}
          </button>
          <button className="btn-reset" onClick={handleReset} title="Reset selection and order">
            <IconAdjustmentsAlt size={16} strokeWidth={1.5} />
            Reset
          </button>
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
              const isSelected = selectedItems.some(i => i.uid === item.uid);

              return (
                <RequestItem
                  key={item.uid}
                  item={item}
                  index={idx}
                  isSelected={isSelected}
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