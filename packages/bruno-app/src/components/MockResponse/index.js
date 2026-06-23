import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { updateRequestPaneTabWidth } from 'providers/ReduxStore/slices/tabs';
import {
  cancelResponseExampleEdit,
  initMockResponseEditor,
  removeMockResponseEditor,
  syncMockResponseEditorSaved,
  updateMockResponseRules
} from 'providers/ReduxStore/slices/collections';
import { saveMockResponse, deleteMockResponse, loadMockResponses } from 'providers/ReduxStore/slices/mock-server';
import { closeTabs, updateTabMeta } from 'providers/ReduxStore/slices/tabs';
import { resolveMockResponseLocation, resolveMockResponseCollection, resolveMockResponseEditorCollection } from 'utils/mock-responses';
import {
  getMockResponseItemUid,
  mockResponseFromEditorItem
} from 'utils/mock-responses/editor';
import ResponseExampleRequestPane from 'components/ResponseExample/ResponseExampleRequestPane';
import ResponseExampleResponsePane from 'components/ResponseExample/ResponseExampleResponsePane';
import MockResponseTopBar from './MockResponseTopBar';
import MockResponseRules from './MockResponseRules';
import StyledWrapper from 'components/ResponseExample/StyledWrapper';

const MIN_LEFT_PANE_WIDTH = 300;
const MIN_RIGHT_PANE_WIDTH = 350;
const MIN_TOP_PANE_HEIGHT = 150;
const MIN_BOTTOM_PANE_HEIGHT = 150;

const MockResponse = ({ instance, collection, responseUid }) => {
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const editor = useSelector((state) => state.collections.mockResponseEditors[responseUid]);
  const responses = useSelector((state) => state.mockServer.mockResponses[instance.uid] || []);
  const preferences = useSelector((state) => state.app.preferences);
  const screenWidth = useSelector((state) => state.app.screenWidth);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const isVerticalLayout = preferences?.layout?.responsePaneOrientation === 'vertical';

  const activeWorkspace = useMemo(() => (
    workspaces.find((workspace) => workspace.uid === activeWorkspaceUid) || null
  ), [workspaces, activeWorkspaceUid]);

  const resolvedCollection = useMemo(() => (
    resolveMockResponseCollection({
      collection,
      instance,
      collections,
      activeWorkspace
    })
  ), [collection, instance, collections, activeWorkspace]);

  const editorCollection = useMemo(() => (
    resolveMockResponseEditorCollection({
      collection: resolvedCollection,
      globalEnvironments,
      activeGlobalEnvironmentUid,
      activeWorkspace
    })
  ), [
    resolvedCollection,
    globalEnvironments,
    activeGlobalEnvironmentUid,
    activeWorkspace,
    resolvedCollection?.activeEnvironmentUid,
    resolvedCollection?.environments
  ]);

  const location = useMemo(() => (
    resolveMockResponseLocation(instance, resolvedCollection, collections, workspaces, activeWorkspace)
  ), [instance, resolvedCollection, collections, workspaces, activeWorkspace]);

  const storedResponse = useMemo(() => (
    responses.find((item) => item.uid === responseUid) || null
  ), [responses, responseUid]);

  const [isLoading, setIsLoading] = useState(!storedResponse);
  const [isSaving, setIsSaving] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState((screenWidth - leftSidebarWidth) / 2.2);
  const [topPaneHeight, setTopPaneHeight] = useState(MIN_TOP_PANE_HEIGHT);
  const [dragging, setDragging] = useState(false);
  const isNewResponse = !storedResponse?.response?.body?.content;
  const [editMode, setEditMode] = useState(isNewResponse);
  const dragOffset = useRef({ x: 0, y: 0 });
  const mainSectionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        await dispatch(loadMockResponses(location)).unwrap();
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || 'Failed to load mock response');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [dispatch, location.mockServerUid, location.collectionPath, location.sourceType, location.workspacePath]);

  useEffect(() => {
    if (!storedResponse) {
      return;
    }

    if (!editor || editor.savedMockResponse?.uid !== storedResponse.uid) {
      dispatch(initMockResponseEditor({
        mockResponse: storedResponse,
        collection: resolvedCollection,
        mockServerUid: instance.uid
      }));
    }
  }, [dispatch, storedResponse, editor, resolvedCollection, instance.uid]);

  useEffect(() => {
    return () => {
      dispatch(removeMockResponseEditor({ responseUid }));
    };
  }, [dispatch, responseUid]);

  const item = editor?.item || null;
  const exampleUid = responseUid;
  const itemUid = getMockResponseItemUid(responseUid);

  const handleMouseMove = (event) => {
    if (dragging && mainSectionRef.current) {
      event.preventDefault();
      const mainRect = mainSectionRef.current.getBoundingClientRect();

      if (isVerticalLayout) {
        const newHeight = event.clientY - mainRect.top - dragOffset.current.y;
        if (newHeight < MIN_TOP_PANE_HEIGHT || newHeight > mainRect.height - MIN_BOTTOM_PANE_HEIGHT) {
          return;
        }
        setTopPaneHeight(newHeight);
      } else {
        const newWidth = event.clientX - mainRect.left - dragOffset.current.x;
        if (newWidth < MIN_LEFT_PANE_WIDTH || newWidth > mainRect.width - MIN_RIGHT_PANE_WIDTH) {
          return;
        }
        setLeftPaneWidth(newWidth);
      }
    }
  };

  const handleMouseUp = (event) => {
    if (dragging && mainSectionRef.current) {
      event.preventDefault();
      setDragging(false);
      if (!isVerticalLayout) {
        const mainRect = mainSectionRef.current.getBoundingClientRect();
        dispatch(updateRequestPaneTabWidth({
          uid: responseUid,
          requestPaneWidth: event.clientX - mainRect.left
        }));
      }
    }
  };

  const handleDragbarMouseDown = (event) => {
    event.preventDefault();
    setDragging(true);

    const dragBarRect = event.currentTarget.getBoundingClientRect();
    if (isVerticalLayout) {
      dragOffset.current.y = event.clientY - dragBarRect.top;
    } else {
      dragOffset.current.x = event.clientX - dragBarRect.left;
    }
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dragging, isVerticalLayout]);

  useEffect(() => {
    if (mainSectionRef.current) {
      const mainRect = mainSectionRef.current.getBoundingClientRect();
      if (isVerticalLayout) {
        setLeftPaneWidth(mainRect.width);
      } else {
        setLeftPaneWidth((screenWidth - leftSidebarWidth) / 2.2);
      }
    }
  }, [isVerticalLayout, screenWidth, leftSidebarWidth]);

  const handleSave = async () => {
    if (!item || !editor) {
      return;
    }

    try {
      const mockResponse = mockResponseFromEditorItem(
        item,
        responseUid,
        editor.rules,
        editor.savedMockResponse
      );

      if (!mockResponse.name?.trim()) {
        toast.error('Mock response name is required');
        return;
      }

      setIsSaving(true);
      const result = await dispatch(saveMockResponse({
        ...location,
        response: mockResponse
      })).unwrap();

      dispatch(syncMockResponseEditorSaved({
        responseUid,
        mockResponse: result.response
      }));
      dispatch(updateTabMeta({
        uid: responseUid,
        tabName: result.response.name,
        responseName: result.response.name
      }));
      setEditMode(false);
      toast.success('Mock response saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save mock response');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (itemUid && editorCollection?.uid) {
      dispatch(cancelResponseExampleEdit({
        itemUid,
        collectionUid: editorCollection.uid,
        exampleUid
      }));
    }
    setEditMode(false);
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteMockResponse({
        ...location,
        responseUid
      })).unwrap();
      dispatch(closeTabs({ tabUids: [responseUid] }));
      toast.success('Mock response deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete mock response');
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (editMode && item) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editMode, item, editor]);

  if (isLoading) {
    return <div className="p-4 text-sm opacity-70">Loading mock response...</div>;
  }

  if (!storedResponse) {
    return (
      <div className="p-4">
        <div className="font-medium">Mock response not found</div>
        <div className="text-sm mt-2 opacity-70">
          It may have been deleted. Return to the mock server dashboard and refresh responses.
        </div>
      </div>
    );
  }

  if (!item || !editorCollection) {
    return <div className="p-4 text-sm opacity-70">Loading mock response...</div>;
  }

  return (
    <StyledWrapper className={`flex flex-col flex-grow relative ${dragging ? 'dragging' : ''} ${isVerticalLayout ? 'vertical-layout' : ''}`}>
      <MockResponseTopBar
        item={item}
        collection={editorCollection}
        exampleUid={exampleUid}
        editMode={editMode}
        onEditToggle={() => setEditMode(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
        copiedFrom={editor.savedMockResponse?.copiedFrom}
      />

      <section ref={mainSectionRef} className={`main wrapper flex mt-4 ${isVerticalLayout ? 'flex-col' : ''} flex-grow pb-4 relative overflow-auto scrollbar-hover`}>
        <section className="request-pane" data-testid="mock-response-request-pane">
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
              collection={editorCollection}
              example={item.draft?.examples?.find((entry) => entry.uid === exampleUid)}
              editMode={editMode}
              exampleUid={exampleUid}
              onSave={handleSave}
            />

            <div className="mt-4">
              <MockResponseRules
                rules={editor.rules}
                editMode={editMode}
                onChange={(rules) => dispatch(updateMockResponseRules({ responseUid, rules }))}
              />
            </div>
          </div>
        </section>

        <div className="dragbar-wrapper" onMouseDown={handleDragbarMouseDown}>
          <div className="dragbar-handle" />
        </div>

        <section className="response-pane flex-grow overflow-x-auto" data-testid="mock-response-response-pane">
          <ResponseExampleResponsePane
            item={item}
            collection={editorCollection}
            example={item.draft?.examples?.find((entry) => entry.uid === exampleUid)}
            editMode={editMode}
            exampleUid={exampleUid}
            onSave={handleSave}
          />
        </section>
      </section>
    </StyledWrapper>
  );
};

export default MockResponse;
