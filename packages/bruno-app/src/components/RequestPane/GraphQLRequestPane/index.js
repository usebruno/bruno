import React, { useEffect, useState } from 'react';
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
import StyledWrapper from './StyledWrapper';
import Documentation from 'components/Documentation/index';
import GraphQLSchemaActions from '../GraphQLSchemaActions/index';

const GraphQLRequestPane = ({ item, collection, leftPaneWidth, onSchemaLoad, toggleDocs, handleGqlClickReference }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const query = item.draft
    ? get(item, 'draft.request.body.graphql.query', '')
    : get(item, 'request.body.graphql.query', '');
  const variables = item.draft
    ? get(item, 'draft.request.body.graphql.variables')
    : get(item, 'request.body.graphql.variables');
  const { displayedTheme } = useTheme();
  const [schema, setSchema] = useState(null);
  const preferences = useSelector((state) => state.app.preferences);

  useEffect(() => {
    onSchemaLoad(schema);
  }, [schema]);

  const onQueryChange = (value) => {
    dispatch(
      updateRequestGraphqlQuery({
        query: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };
  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const selectTab = (tab) => {
    dispatch(
      updateRequestPaneTab({
        uid: item.uid,
        requestPaneTab: tab
      })
    );
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'query': {
        return (
          <QueryEditor
            collection={collection}
            theme={displayedTheme}
            schema={schema}
            width={leftPaneWidth}
            onSave={onSave}
            value={query}
            onRun={onRun}
            onEdit={onQueryChange}
            onClickReference={handleGqlClickReference}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
          />
        );
      }
      case 'variables': {
        return <GraphQLVariables item={item} variables={variables} collection={collection} />;
      }
      case 'headers': {
        return <RequestHeaders item={item} collection={collection} />;
      }
      case 'auth': {
        return <Auth item={item} collection={collection} />;
      }
      case 'vars': {
        return <Vars item={item} collection={collection} />;
      }
      case 'assert': {
        return <Assertions item={item} collection={collection} />;
      }
      case 'script': {
        return <Script item={item} collection={collection} />;
      }
      case 'tests': {
        return <Tests item={item} collection={collection} />;
      }
      case 'docs': {
        return <Documentation item={item} collection={collection} />;
      }
      default: {
        return <div className="mt-4">404 | Not found</div>;
      }
    }
  };

  if (!activeTabUid) {
    return <div>Something went wrong</div>;
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!focusedTab || !focusedTab.uid || !focusedTab.requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === focusedTab.requestPaneTab
    });
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('query')} role="tab" onClick={() => selectTab('query')}>
          Query
        </div>
        <div className={getTabClassname('variables')} role="tab" onClick={() => selectTab('variables')}>
          Variables
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          Headers
        </div>
        <div className={getTabClassname('auth')} role="tab" onClick={() => selectTab('auth')}>
          Auth
        </div>
        <div className={getTabClassname('vars')} role="tab" onClick={() => selectTab('vars')}>
          Vars
        </div>
        <div className={getTabClassname('script')} role="tab" onClick={() => selectTab('script')}>
          Script
        </div>
        <div className={getTabClassname('assert')} role="tab" onClick={() => selectTab('assert')}>
          Assert
        </div>
        <div className={getTabClassname('tests')} role="tab" onClick={() => selectTab('tests')}>
          Tests
        </div>
        <div className={getTabClassname('docs')} role="tab" onClick={() => selectTab('docs')}>
          Docs
        </div>
        <GraphQLSchemaActions item={item} collection={collection} onSchemaLoad={setSchema} toggleDocs={toggleDocs} />
      </div>
      <section className="flex w-full mt-5 flex-1">{getTabPanel(focusedTab.requestPaneTab)}</section>
    </StyledWrapper>
  );
};

export default GraphQLRequestPane;
