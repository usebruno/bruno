import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import find from 'lodash/find';
import get from 'lodash/get';
import classnames from 'classnames';
import { IconWand, IconDots, IconBook, IconDownload, IconRefresh, IconFile, IconChevronDown, IconChevronRight } from '@tabler/icons';
import IconSidebarToggle from 'components/Icons/IconSidebarToggle';
import ActionIcon from 'ui/ActionIcon';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestPaneTab, updateQueryBuilderOpen, updateQueryBuilderWidth, updateVariablesPaneOpen, updateVariablesPaneHeight } from 'providers/ReduxStore/slices/tabs';
import QueryEditor from 'components/RequestPane/QueryEditor';
import QueryBuilder from 'components/RequestPane/QueryBuilder';
import MenuDropdown from 'ui/MenuDropdown';
import Auth from 'components/RequestPane/Auth';
import GraphQLVariables from 'components/RequestPane/GraphQLVariables';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import Vars from 'components/RequestPane/Vars';
import Assertions from 'components/RequestPane/Assertions';
import Script from 'components/RequestPane/Script';
import Tests from 'components/RequestPane/Tests';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';
import { updateRequestGraphqlQuery, updateRequestGraphqlVariables } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import Documentation from 'components/Documentation/index';
import useGraphqlSchema from '../GraphQLSchemaActions/useGraphqlSchema';
import { findEnvironmentInCollection } from 'utils/collections';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import Settings from 'components/RequestPane/Settings';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import AuthMode from '../Auth/AuthMode/index';

const TAB_CONFIG = [
  { key: 'query', label: 'Query' },
  { key: 'headers', label: 'Headers' },
  { key: 'auth', label: 'Auth' },
  { key: 'vars', label: 'Vars' },
  { key: 'script', label: 'Script' },
  { key: 'assert', label: 'Assert' },
  { key: 'tests', label: 'Tests' },
  { key: 'docs', label: 'Docs' },
  { key: 'settings', label: 'Settings' }
];

const GraphQLRequestPane = ({ item, collection, onSchemaLoad, toggleDocs, handleGqlClickReference }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const preferences = useSelector((state) => state.app.preferences);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const requestPaneTab = focusedTab?.requestPaneTab;
  const showQueryBuilder = focusedTab?.queryBuilderOpen || false;
  const queryBuilderWidth = focusedTab?.queryBuilderWidth || 320;
  const variablesOpen = focusedTab?.variablesPaneOpen || false;
  const variablesHeight = focusedTab?.variablesPaneHeight || 150;
  const queryBuilderDraggingRef = useRef(false);
  const variablesDraggingRef = useRef(false);
  const queryBuilderContainerRef = useRef(null);
  const queryEditorRef = useRef(null);

  const query = item.draft
    ? get(item, 'draft.request.body.graphql.query', '')
    : get(item, 'request.body.graphql.query', '');
  const variables = item.draft
    ? get(item, 'draft.request.body.graphql.variables', '')
    : get(item, 'request.body.graphql.variables', '');

  const { displayedTheme } = useTheme();

  const url = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');
  const pathname = item.draft ? get(item, 'draft.pathname', '') : get(item, 'pathname', '');
  const uid = item.draft ? get(item, 'draft.uid', '') : get(item, 'uid', '');
  const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
  const request = item.draft ? { ...item.draft.request, pathname, uid } : { ...item.request, pathname, uid };

  const { schema, schemaSource, loadSchema, isLoading: isSchemaLoading, error: schemaError } = useGraphqlSchema(url, environment, request, collection);

  const schemaActionsRef = useRef(null);

  useEffect(() => {
    onSchemaLoad(schema);
  }, [schema, onSchemaLoad]);

  const toggleQueryBuilder = useCallback(() => {
    dispatch(updateQueryBuilderOpen({ uid: item.uid, queryBuilderOpen: !showQueryBuilder }));
  }, [dispatch, item.uid, showQueryBuilder]);

  const variablesOpenRef = useRef(variablesOpen);
  variablesOpenRef.current = variablesOpen;

  const handleMouseMove = useCallback((e) => {
    if (queryBuilderDraggingRef.current && queryBuilderContainerRef.current) {
      e.preventDefault();
      const containerRect = queryBuilderContainerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const maxWidth = Math.min(600, containerRect.width * 0.5);
      dispatch(updateQueryBuilderWidth({ uid: item.uid, queryBuilderWidth: Math.max(200, Math.min(newWidth, maxWidth)) }));
    }
    if (variablesDraggingRef.current && queryBuilderContainerRef.current) {
      e.preventDefault();
      const containerRect = queryBuilderContainerRef.current.getBoundingClientRect();
      // Subtract the header height (~30px) from the drag calculation
      const newHeight = containerRect.bottom - e.clientY - 30;
      if (newHeight < 40) {
        dispatch(updateVariablesPaneOpen({ uid: item.uid, variablesPaneOpen: false }));
      } else {
        if (!variablesOpenRef.current) dispatch(updateVariablesPaneOpen({ uid: item.uid, variablesPaneOpen: true }));
        dispatch(updateVariablesPaneHeight({ uid: item.uid, variablesPaneHeight: Math.max(80, Math.min(newHeight, containerRect.height * 0.6)) }));
      }
    }
  }, [dispatch, item.uid]);

  const handleMouseUp = useCallback(() => {
    queryBuilderDraggingRef.current = false;
    variablesDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const startDrag = useCallback((ref) => {
    ref.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const onQueryChange = useCallback(
    (value) => {
      dispatch(
        updateRequestGraphqlQuery({
          query: value,
          itemUid: item.uid,
          collectionUid: collection.uid
        })
      );
    },
    [dispatch, item.uid, collection.uid]
  );

  const onVariablesChange = useCallback(
    (value) => {
      dispatch(
        updateRequestGraphqlVariables({
          variables: value,
          itemUid: item.uid,
          collectionUid: collection.uid
        })
      );
    },
    [dispatch, item.uid, collection.uid]
  );

  const onRun = useCallback(
    () => dispatch(sendRequest(item, collection.uid)),
    [dispatch, item, collection.uid]
  );

  const onSave = useCallback(
    () => dispatch(saveRequest(item.uid, collection.uid)),
    [dispatch, item.uid, collection.uid]
  );

  const selectTab = useCallback(
    (tabKey) => {
      dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: tabKey }));
    },
    [dispatch, item.uid]
  );

  const allTabs = useMemo(() => TAB_CONFIG.map(({ key, label }) => ({ key, label })), []);

  const handlePrettify = useCallback(() => {
    if (queryEditorRef.current?.beautifyRequestBody) {
      queryEditorRef.current.beautifyRequestBody();
    }
    if (variables) {
      try {
        const pretty = JSON.stringify(JSON.parse(variables), null, 2);
        if (pretty !== variables) {
          onVariablesChange(pretty);
        }
      } catch {
        // Variables JSON is invalid, skip prettifying
      }
    }
  }, [variables, onVariablesChange]);

  const tabPanel = useMemo(() => {
    switch (requestPaneTab) {
      case 'query':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0">
              <QueryEditor
                ref={queryEditorRef}
                collection={collection}
                theme={displayedTheme}
                schema={schema}
                onSave={onSave}
                value={query}
                onRun={onRun}
                onEdit={onQueryChange}
                onClickReference={handleGqlClickReference}
                onPrettifyQuery={handlePrettify}
                font={get(preferences, 'font.codeFont', 'default')}
                fontSize={get(preferences, 'font.codeFontSize')}
              />
            </div>
            <div
              className="variables-section"
              style={variablesOpen ? { height: `${variablesHeight}px`, minHeight: `${variablesHeight}px` } : {}}
            >
              <div
                className="variables-dragbar"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startDrag(variablesDraggingRef);
                }}
              />
              <button
                type="button"
                className="variables-header"
                onClick={() => dispatch(updateVariablesPaneOpen({ uid: item.uid, variablesPaneOpen: !variablesOpen }))}
                aria-expanded={variablesOpen}
              >
                <span className="variables-chevron">
                  {variablesOpen ? (
                    <IconChevronDown size={14} strokeWidth={2} />
                  ) : (
                    <IconChevronRight size={14} strokeWidth={2} />
                  )}
                </span>
                <span>Variables</span>
              </button>
              {variablesOpen && (
                <div className="flex-1 min-h-0 relative">
                  <GraphQLVariables item={item} variables={variables} collection={collection} />
                </div>
              )}
            </div>
          </div>
        );
      case 'headers':
        return <RequestHeaders item={item} collection={collection} />;
      case 'auth':
        return <Auth item={item} collection={collection} />;
      case 'vars':
        return <Vars item={item} collection={collection} />;
      case 'assert':
        return <Assertions item={item} collection={collection} />;
      case 'script':
        return <Script item={item} collection={collection} />;
      case 'tests':
        return <Tests item={item} collection={collection} />;
      case 'docs':
        return <Documentation item={item} collection={collection} />;
      case 'settings':
        return <Settings item={item} collection={collection} />;
      default:
        return <div className="mt-4">404 | Not found</div>;
    }
  }, [requestPaneTab, item, collection, displayedTheme, schema, onSave, query, onRun, onQueryChange, handleGqlClickReference, handlePrettify, preferences, variables, variablesOpen, variablesHeight, dispatch]);

  const queryMenuItems = useMemo(() => [
    {
      id: 'docs',
      label: 'Docs',
      leftSection: IconBook,
      onClick: toggleDocs
    },
    {
      id: 'schema-introspection',
      label: schema && schemaSource === 'introspection' ? 'Refresh from Introspection' : 'Load from Introspection',
      leftSection: schema && schemaSource === 'introspection' ? IconRefresh : IconDownload,
      onClick: () => loadSchema('introspection'),
      disabled: isSchemaLoading
    },
    {
      id: 'schema-file',
      label: 'Load from File',
      leftSection: IconFile,
      onClick: () => loadSchema('file'),
      disabled: isSchemaLoading
    }
  ], [toggleDocs, schema, schemaSource, loadSchema, isSchemaLoading]);

  if (!activeTabUid || !focusedTab?.uid || !requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const rightContent = requestPaneTab === 'auth' ? (
    <div ref={schemaActionsRef} className="flex flex-grow justify-start items-center">
      <AuthMode item={item} collection={collection} />
    </div>
  ) : requestPaneTab === 'query' ? (
    <div ref={schemaActionsRef} className="flex items-center gap-2">
      <ActionIcon
        label="Prettify"
        onClick={handlePrettify}
      >
        <IconWand size={14} strokeWidth={1.5} />
      </ActionIcon>
      <ActionIcon
        label={showQueryBuilder ? 'Hide Query Builder' : 'Show Query Builder'}
        onClick={toggleQueryBuilder}
      >
        <IconSidebarToggle collapsed={!showQueryBuilder} size={16} strokeWidth={1.5} />
      </ActionIcon>
      <MenuDropdown items={queryMenuItems} placement="bottom-end">
        <ActionIcon label="More actions">
          <IconDots size={16} strokeWidth={1.5} />
        </ActionIcon>
      </MenuDropdown>
    </div>
  ) : null;

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <ResponsiveTabs
        tabs={allTabs}
        activeTab={requestPaneTab}
        onTabSelect={selectTab}
        rightContent={rightContent}
        rightContentRef={rightContent ? schemaActionsRef : null}
      />

      <section ref={queryBuilderContainerRef} className={classnames('flex w-full flex-1 mt-4 min-h-0')}>
        {requestPaneTab === 'query' && showQueryBuilder && (
          <>
            <div className="graphql-query-builder-container" style={{ width: `${queryBuilderWidth}px`, minWidth: `${queryBuilderWidth}px` }}>
              <QueryBuilder
                schema={schema}
                onQueryChange={onQueryChange}
                editorValue={query}
                onVariablesChange={onVariablesChange}
                variablesValue={variables}
                loadSchema={loadSchema}
                isSchemaLoading={isSchemaLoading}
                schemaError={schemaError}
              />
            </div>
            <div
              className="query-builder-dragbar"
              onMouseDown={(e) => {
                e.preventDefault();
                startDrag(queryBuilderDraggingRef);
              }}
            />
          </>
        )}
        <HeightBoundContainer style={{ minWidth: 200 }}>{tabPanel}</HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default GraphQLRequestPane;
