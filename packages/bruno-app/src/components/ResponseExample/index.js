import GenerateCodeItem from 'components/Sidebar/Collections/Collection/CollectionItem/GenerateCodeItem';
import { filter } from 'lodash';
import cloneDeep from 'lodash/cloneDeep';
import path from 'path';
import { cancelResponseExampleEdit } from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { addTab, updateRequestPaneTabWidth } from 'providers/ReduxStore/slices/tabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { findCollectionByUid, findItemInCollectionByPathname, findParentItemInCollection, isItemAFolder } from 'utils/collections';
import { getDefaultRequestPaneTab } from 'utils/collections/index';
import { uuid } from 'utils/common';
import { sanitizeName } from 'utils/common/regex';
import ResponseExampleRequestPane from './ResponseExampleRequestPane';
import ResponseExampleResponsePane from './ResponseExampleResponsePane';
import ResponseExampleTopBar from './ResponseExampleTopBar';
import StyledWrapper from './StyledWrapper';

const MIN_LEFT_PANE_WIDTH = 300;
const MIN_RIGHT_PANE_WIDTH = 350;
const MIN_TOP_PANE_HEIGHT = 150;
const MIN_BOTTOM_PANE_HEIGHT = 150;

// Helper function to generate unique name with auto-incrementing numbers
const generateUniqueName = async (baseName, parentItem) => {
  const items = parentItem.items || [];
  const existingNames = new Set(
    items
      .filter((i) => !isItemAFolder(i))
      .map((i) => i.name)
  );

  // Try base name first
  const candidateBase = `${baseName} (Example Copy)`;
  if (!existingNames.has(candidateBase)) {
    return candidateBase;
  }

  // Find next available number
  let counter = 2;
  while (true) {
    const candidateName = `${baseName} (Example Copy ${counter})`;
    if (!existingNames.has(candidateName)) {
      return candidateName;
    }
    counter++;
  }
};

const ResponseExample = ({ item, collection, example }) => {
  const dispatch = useDispatch();
  const store = useStore();
  const state = store.getState();
  const preferences = useSelector((state) => state.app.preferences);
  const screenWidth = useSelector((state) => state.app.screenWidth);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const isVerticalLayout = preferences?.layout?.responsePaneOrientation === 'vertical';

  const [leftPaneWidth, setLeftPaneWidth] = useState((screenWidth - leftSidebarWidth) / 2.2);
  const [topPaneHeight, setTopPaneHeight] = useState(MIN_TOP_PANE_HEIGHT);
  const [dragging, setDragging] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showGenerateCodeModal, setShowGenerateCodeModal] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const mainSectionRef = useRef(null);

  const handleMouseMove = (e) => {
    if (dragging && mainSectionRef.current) {
      e.preventDefault();
      const mainRect = mainSectionRef.current.getBoundingClientRect();

      if (isVerticalLayout) {
        const newHeight = e.clientY - mainRect.top - dragOffset.current.y;
        if (newHeight < MIN_TOP_PANE_HEIGHT || newHeight > mainRect.height - MIN_BOTTOM_PANE_HEIGHT) {
          return;
        }
        setTopPaneHeight(newHeight);
      } else {
        const newWidth = e.clientX - mainRect.left - dragOffset.current.x;
        if (newWidth < MIN_LEFT_PANE_WIDTH || newWidth > mainRect.width - MIN_RIGHT_PANE_WIDTH) {
          return;
        }
        setLeftPaneWidth(newWidth);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (dragging && mainSectionRef.current) {
      e.preventDefault();
      setDragging(false);
      if (!isVerticalLayout) {
        const mainRect = mainSectionRef.current.getBoundingClientRect();
        dispatch(updateRequestPaneTabWidth({
          uid: item.uid,
          requestPaneWidth: e.clientX - mainRect.left
        }));
      }
    }
  };

  const handleDragbarMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);

    if (isVerticalLayout) {
      const dragBar = e.currentTarget;
      const dragBarRect = dragBar.getBoundingClientRect();
      dragOffset.current.y = e.clientY - dragBarRect.top;
    } else {
      const dragBar = e.currentTarget;
      const dragBarRect = dragBar.getBoundingClientRect();
      dragOffset.current.x = e.clientX - dragBarRect.left;
    }
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dragging]);

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleSave = () => {
    if (item && collection) {
      dispatch(saveRequest(item.uid, collection.uid));
      setEditMode(false);
    }
  };

  const handleCancel = () => {
    if (item && collection && example?.uid) {
      dispatch(cancelResponseExampleEdit({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: example.uid
      }));
    }
    setEditMode(false);
  };

  const handleGenerateCode = (exampleData) => {
    setShowGenerateCodeModal(true);
  };

  const handleCloseGenerateCodeModal = () => {
    setShowGenerateCodeModal(false);
  };

  const handleTryExample = useCallback(async () => {
    // Validate example
    if (!example?.request) {
      console.error('Invalid example data');
      toast.error('Unable to create request from example');
      return;
    }

    try {
      const parentItem = findParentItemInCollection(collection, item.uid);
      const newRequestUid = uuid();

      // Generate unique name with auto-incrementing numbers
      const uniqueName = await generateUniqueName(example.name, parentItem || collection);
      const filename = `${sanitizeName(uniqueName)}.${collection.format || 'bru'}`;

      // Create complete request item structure matching Bruno's format
      const newRequestItem = {
        uid: newRequestUid,
        name: uniqueName,
        filename: filename,
        type: item.type,
        request: {
          ...cloneDeep(example.request),
          headers: example.request.headers || [],
          params: example.request.params || [],
          body: example.request.body || {
            mode: 'none',
            json: null,
            text: null,
            xml: null,
            sparql: null,
            multipartForm: [],
            formUrlEncoded: [],
            file: []
          },
          vars: example.request.vars || {
            req: [],
            res: []
          },
          script: example.request.script || {
            req: null,
            res: null
          },
          assertions: example.request.assertions || [],
          tests: example.request.tests || null,
          auth: example.request.auth || {
            mode: 'inherit'
          }
        }
      };

      const parentItems = parentItem ? parentItem.items : collection.items;
      const requestItems = filter(parentItems, (i) => !isItemAFolder(i));
      newRequestItem.seq = requestItems ? requestItems.length + 1 : 1;

      // V.Imp: Normalise the full pathname for the new file
      const fullPathname = path.normalize(
        parentItem
          ? path.join(parentItem.pathname, filename)
          : path.join(collection.pathname, filename)
      );

      console.log('[handleTryExample] Creating file at:', fullPathname);

      const { ipcRenderer } = window;

      // Save to filesystem
      await ipcRenderer.invoke('renderer:new-request', fullPathname, newRequestItem);

      toast.success(`Request from example "${example.name}" created successfully`);

      // Wait for filesystem watcher using store subscription
      const waitForItem = () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            unsubscribe();
            console.error('[handleTryExample] Timeout waiting for filesystem watcher');
            console.error('[handleTryExample] Expected pathname:', fullPathname);

            // Log all items in parent to debug
            const state = store.getState();
            const currentCollection = findCollectionByUid(state.collections.collections, collection.uid);
            const parent = parentItem ? findItemInCollectionByPathname(currentCollection, parentItem.pathname) : currentCollection;
            console.error('[handleTryExample] Items in parent:', parent?.items?.map((i) => ({
              name: i.name,
              pathname: i.pathname
            })));

            reject(new Error('Timeout waiting for item to be added by filesystem watcher'));
          }, 5000); // 5 second timeout

          let checkCount = 0;

          // Subscribe to store changes
          const unsubscribe = store.subscribe(() => {
            checkCount++;
            const state = store.getState();
            const currentCollection = findCollectionByUid(state.collections.collections, collection.uid);

            if (!currentCollection) {
              console.warn('[handleTryExample] Collection not found');
              return;
            }

            // Try to find by normalized pathname
            let loadedItem = findItemInCollectionByPathname(currentCollection, fullPathname);

            if (!loadedItem) {
              const parent = parentItem
                ? findItemInCollectionByPathname(currentCollection, parentItem.pathname)
                : currentCollection;

              if (parent && parent.items) {
                loadedItem = parent.items.find((i) =>
                  i.filename === filename
                  && !i.loading
                  && !i.partial
                );
                // Found item by filename match
              }
            }

            if (loadedItem && !loadedItem.loading && !loadedItem.partial) {
              clearTimeout(timeout);
              unsubscribe();
              resolve(loadedItem);
            }
          });

          // Also check immediately in case it's already there
          const state = store.getState();
          const currentCollection = findCollectionByUid(state.collections.collections, collection.uid);
          let existingItem = findItemInCollectionByPathname(currentCollection, fullPathname);

          // Fallback:  find by filename
          if (!existingItem) {
            const parent = parentItem
              ? findItemInCollectionByPathname(currentCollection, parentItem.pathname)
              : currentCollection;

            if (parent && parent.items) {
              existingItem = parent.items.find((i) =>
                i.filename === filename
                && !i.loading
                && !i.partial
              );
            }
          }

          if (existingItem && !existingItem.loading && !existingItem.partial) {
            clearTimeout(timeout);
            unsubscribe();
            resolve(existingItem);
          }
        });
      };

      // Wait for the item
      const loadedItem = await waitForItem();

      // Add tab
      dispatch(addTab({
        uid: loadedItem.uid,
        collectionUid: collection.uid,
        requestPaneTab: getDefaultRequestPaneTab(loadedItem),
        type: loadedItem.type
      }));

      // Send request
      dispatch(sendRequest(loadedItem, collection.uid));
    } catch (error) {
      console.error('Failed to create request from example:', error);
      toast.error(error?.message || 'Failed to create request from example');
    }
  }, [example, collection, item, dispatch, store]);

  // Update width when screen width or sidebar width changes
  useEffect(() => {
    if (mainSectionRef.current) {
      const mainRect = mainSectionRef.current.getBoundingClientRect();
      if (isVerticalLayout) {
        // In vertical mode, set leftPaneWidth to full container width
        setLeftPaneWidth(mainRect.width);
      } else {
        // In horizontal mode, set to roughly half width
        setLeftPaneWidth((screenWidth - leftSidebarWidth) / 2.2);
      }
    }
  }, [isVerticalLayout, screenWidth, leftSidebarWidth]);

  // Keyboard shortcut support for Ctrl/Cmd+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (editMode && item && collection) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editMode, item, collection]);

  return (
    <>
      <StyledWrapper className={`flex flex-col flex-grow relative ${dragging ? 'dragging' : ''} ${isVerticalLayout ? 'vertical-layout' : ''}`}>
        <ResponseExampleTopBar
          item={item}
          collection={collection}
          exampleUid={example.uid}
          editMode={editMode}
          onEditToggle={handleEditToggle}
          onSave={handleSave}
          onCancel={handleCancel}
          onGenerateCode={handleGenerateCode}
          onTryExample={handleTryExample}
        />
        <section ref={mainSectionRef} className={`main wrapper flex mt-4 ${isVerticalLayout ? 'flex-col' : ''} flex-grow pb-4 relative overflow-auto scrollbar-hover`}>
          <section className="request-pane">
            <div
              className="px-4 h-full"
              style={isVerticalLayout ? {
                height: `${Math.max(topPaneHeight, MIN_TOP_PANE_HEIGHT)}px`,
                minHeight: `${MIN_TOP_PANE_HEIGHT}px`,
                width: '100%'
              } : {
                width: `${Math.max(leftPaneWidth, MIN_LEFT_PANE_WIDTH)}px`
              }}
            >
              <ResponseExampleRequestPane
                item={item}
                collection={collection}
                example={example}
                editMode={editMode}
                exampleUid={example?.uid}
                onSave={handleSave}
              />
            </div>
          </section>

          <div className="dragbar-wrapper" onMouseDown={handleDragbarMouseDown}>
            <div className="dragbar-handle" />
          </div>

          <section className="response-pane flex-grow overflow-x-auto">
            <ResponseExampleResponsePane
              item={item}
              collection={collection}
              example={example}
              editMode={editMode}
              exampleUid={example?.uid}
              onSave={handleSave}
            />
          </section>
        </section>
      </StyledWrapper>

      {showGenerateCodeModal && (
        <GenerateCodeItem
          collectionUid={collection.uid}
          item={item}
          onClose={handleCloseGenerateCodeModal}
          isExample={true}
          exampleUid={example.uid}
        />
      )}
    </>
  );
};

export default ResponseExample;
