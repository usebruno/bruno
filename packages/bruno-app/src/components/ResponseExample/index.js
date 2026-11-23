import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestPaneTabWidth, setExampleEditMode, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { saveRequest, tryResponseExample } from 'providers/ReduxStore/slices/collections/actions';
import { cancelResponseExampleEdit } from 'providers/ReduxStore/slices/collections';
import ResponseExampleTopBar from './ResponseExampleTopBar';
import ResponseExampleRequestPane from './ResponseExampleRequestPane';
import ResponseExampleResponsePane from './ResponseExampleResponsePane';
import GenerateCodeItem from 'components/Sidebar/Collections/Collection/CollectionItem/GenerateCodeItem';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { hasExampleChanges } from 'utils/collections';

const MIN_LEFT_PANE_WIDTH = 300;
const MIN_RIGHT_PANE_WIDTH = 350;
const MIN_TOP_PANE_HEIGHT = 150;
const MIN_BOTTOM_PANE_HEIGHT = 150;

const ResponseExample = ({ item, collection, example, openInEditMode }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const screenWidth = useSelector((state) => state.app.screenWidth);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const isVerticalLayout = preferences?.layout?.responsePaneOrientation === 'vertical';

  const [leftPaneWidth, setLeftPaneWidth] = useState((screenWidth - leftSidebarWidth) / 2.2);
  const [topPaneHeight, setTopPaneHeight] = useState(MIN_TOP_PANE_HEIGHT);
  const [dragging, setDragging] = useState(false);
  // Edit mode lives on the tab (`openInEditMode`) so every save path — including a
  // workspace-wide Save all — exits it through the store. It is set at tab creation by the
  // OPEN_EXAMPLE task queue (see taskMiddleware.js) for just-created examples.
  const editMode = !!openInEditMode;
  const [showGenerateCodeModal, setShowGenerateCodeModal] = useState(false);
  const [isTryPending, setIsTryPending] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const mainSectionRef = useRef(null);

  // A reopened tab for an example with unsaved changes re-enters edit mode.
  useEffect(() => {
    if (!openInEditMode && example?.uid && hasExampleChanges(item, example.uid)) {
      dispatch(setExampleEditMode({ uid: example.uid, editMode: true }));
    }
  }, []);

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
    if (example?.uid) {
      dispatch(setExampleEditMode({ uid: example.uid, editMode: !editMode }));
    }
  };

  const handleSave = () => {
    if (item && collection) {
      dispatch(saveRequest(item.uid, collection.uid));
      if (example?.uid) {
        dispatch(setExampleEditMode({ uid: example.uid, editMode: false }));
      }
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
    if (example?.uid) {
      dispatch(setExampleEditMode({ uid: example.uid, editMode: false }));
    }
  };

  const handleGenerateCode = (exampleData) => {
    setShowGenerateCodeModal(true);
  };

  const handleCloseGenerateCodeModal = () => {
    setShowGenerateCodeModal(false);
  };

  const handleTryExample = async () => {
    // a preview example tab would otherwise be replaced by the new transient request tab
    dispatch(makeTabPermanent({ uid: example.uid }));
    setIsTryPending(true);
    try {
      await dispatch(tryResponseExample({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: example.uid
      }));
    } catch (err) {
      toast.error(err?.message || 'Failed to try example');
    } finally {
      setIsTryPending(false);
    }
  };

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
          isTryPending={isTryPending}
        />
        <section ref={mainSectionRef} className={`main wrapper flex mt-4 ${isVerticalLayout ? 'flex-col' : ''} flex-grow pb-4 relative overflow-auto scrollbar-hover`}>
          <section className="request-pane" data-testid="request-pane">
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

          <section className="response-pane flex-grow overflow-x-auto" data-testid="response-pane">
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
