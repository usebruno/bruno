import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import find from 'lodash/find';
import get from 'lodash/get';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import QueryEditor from 'components/RequestPane/QueryEditor';
import Auth from 'components/RequestPane/Auth';
import GraphQLVariables from 'components/RequestPane/GraphQLVariables';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import Vars from 'components/RequestPane/Vars';
import Assertions from 'components/RequestPane/Assertions';
import Script from 'components/RequestPane/Script';
import Tests from 'components/RequestPane/Tests';
import { useTheme } from 'providers/Theme';
import { updateRequestGraphqlQuery } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import Documentation from 'components/Documentation/index';
import GraphQLSchemaActions from '../GraphQLSchemaActions/index';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import Settings from 'components/RequestPane/Settings';
import ResponsiveTabs from 'ui/ResponsiveTabs';

const MULTIPLE_CONTENT_TABS = new Set(['script', 'vars', 'auth', 'docs']);

const TAB_CONFIG = [
  { key: 'query', label: 'Query' },
  { key: 'variables', label: 'Variables' },
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

  const query = item.draft
    ? get(item, 'draft.request.body.graphql.query', '')
    : get(item, 'request.body.graphql.query', '');
  const variables = item.draft
    ? get(item, 'draft.request.body.graphql.variables')
    : get(item, 'request.body.graphql.variables');

  const { displayedTheme } = useTheme();
  const [schema, setSchema] = useState(null);
  const schemaActionsRef = useRef(null);

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const requestPaneTab = focusedTab?.requestPaneTab;

  useEffect(() => {
    onSchemaLoad(schema);
  }, [schema, onSchemaLoad]);

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

  const tabPanel = useMemo(() => {
    switch (requestPaneTab) {
      case 'query':
        return (
          <QueryEditor
            collection={collection}
            theme={displayedTheme}
            schema={schema}
            onSave={onSave}
            value={query}
            onRun={onRun}
            onEdit={onQueryChange}
            onClickReference={handleGqlClickReference}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
          />
        );
      case 'variables':
        return <GraphQLVariables item={item} variables={variables} collection={collection} />;
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
  }, [requestPaneTab, item, collection, displayedTheme, schema, onSave, query, onRun, onQueryChange, handleGqlClickReference, preferences, variables]);

  if (!activeTabUid || !focusedTab?.uid || !requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const isMultipleContentTab = MULTIPLE_CONTENT_TABS.has(requestPaneTab);

  const rightContent = (
    <div ref={schemaActionsRef}>
      <GraphQLSchemaActions item={item} collection={collection} onSchemaLoad={setSchema} toggleDocs={toggleDocs} />
    </div>
  );

  return (
    <div className="flex flex-col h-full relative">
      <ResponsiveTabs
        tabs={allTabs}
        activeTab={requestPaneTab}
        onTabSelect={selectTab}
        rightContent={rightContent}
        rightContentRef={schemaActionsRef}
      />

      <section className={classnames('flex w-full flex-1', { 'mt-5': !isMultipleContentTab })}>
        <HeightBoundContainer>{tabPanel}</HeightBoundContainer>
      </section>
    </div>
  );
};

export default GraphQLRequestPane;
