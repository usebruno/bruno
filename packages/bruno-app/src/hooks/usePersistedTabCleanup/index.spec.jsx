import React, { Component, useEffect } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider, useSelector } from 'react-redux';
import tabsReducer, { addTab, closeAllCollectionTabs, closeTabs, focusTab } from 'providers/ReduxStore/slices/tabs';
import { readPersistedSearchState, writePersistedSearchState } from 'components/CodeEditor/state-persistence';
import usePersistedTabCleanup from './index';

const searchState = { visible: true, searchText: 'private response', regex: true };
const readSearch = (scope) => readPersistedSearchState({ scope, key: 'response:editor' });
const writeSearch = (scope) => writePersistedSearchState({ scope, key: 'response:editor', state: searchState });

class ResponseEditor extends Component {
  componentWillUnmount() {
    writeSearch(this.props.uid);
  }

  render() {
    return <div>{this.props.uid}</div>;
  }
}

function ScrollCleanup({ uid }) {
  useEffect(() => () => localStorage.setItem(`persisted::${uid}::scroll`, '100'), [uid]);
  return null;
}

function TabHost({ manageWorkspace }) {
  usePersistedTabCleanup();
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  if (manageWorkspace || !activeTabUid) return null;
  return (
    <>
      <ResponseEditor key={activeTabUid} uid={activeTabUid} />
      <ScrollCleanup key={`scroll-${activeTabUid}`} uid={activeTabUid} />
    </>
  );
}

function setup(tabs, activeTabUid = tabs[0]?.uid) {
  const store = configureStore({
    reducer: { tabs: tabsReducer },
    preloadedState: { tabs: { tabs, activeTabUid, recentlyClosedTabs: [] } }
  });
  for (const tab of tabs) writeSearch(tab.uid);
  const renderHost = (manageWorkspace = false) => (
    <Provider store={store}>
      <TabHost manageWorkspace={manageWorkspace} />
    </Provider>
  );
  const view = render(renderHost());
  return { store, ...view, showManageWorkspace: () => view.rerender(renderHost(true)) };
}

describe('persisted tab cleanup', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('clears replaced previews after unmount and leaves no orphan when the collection closes', () => {
    const { store } = setup([
      { uid: 'other', collectionUid: 'other-collection', preview: false },
      { uid: 'preview-a', collectionUid: 'collection', preview: true }
    ], 'preview-a');

    act(() => store.dispatch(addTab({ uid: 'preview-b', collectionUid: 'collection', preview: true })));

    expect(screen.getByText('preview-b')).toBeInTheDocument();
    expect(readSearch('preview-a')).toBeNull();
    expect(localStorage.getItem('persisted::preview-a::scroll')).toBeNull();
    expect(readSearch('other')).toEqual(searchState);

    act(() => store.dispatch(closeAllCollectionTabs({ collectionUid: 'collection' })));

    expect(readSearch('preview-a')).toBeNull();
    expect(readSearch('preview-b')).toBeNull();
    expect(readSearch('other')).toEqual(searchState);
  });

  it('preserves searches on focus switches and clears an inactive closed tab', () => {
    const { store } = setup([
      { uid: 'a', collectionUid: 'collection', preview: false },
      { uid: 'b', collectionUid: 'collection', preview: false }
    ]);

    act(() => store.dispatch(focusTab({ uid: 'b' })));

    expect(readSearch('a')).toEqual(searchState);
    expect(readSearch('b')).toEqual(searchState);

    act(() => store.dispatch(closeTabs({ tabUids: ['a'] })));

    expect(screen.getByText('b')).toBeInTheDocument();
    expect(readSearch('a')).toBeNull();
    expect(readSearch('b')).toEqual(searchState);
  });

  it('clears the last tab after both class and passive unmount writes', () => {
    const { store } = setup([{ uid: 'last', collectionUid: 'collection', preview: false }]);

    act(() => store.dispatch(closeTabs({ tabUids: ['last'] })));

    expect(screen.queryByText('last')).not.toBeInTheDocument();
    expect(readSearch('last')).toBeNull();
    expect(localStorage.getItem('persisted::last::scroll')).toBeNull();
  });

  it('stays active on Manage Workspace while request panels are unmounted', () => {
    const view = setup([{ uid: 'a', collectionUid: 'collection', preview: false }]);
    view.showManageWorkspace();
    expect(readSearch('a')).toEqual(searchState);

    act(() => view.store.dispatch(closeAllCollectionTabs({ collectionUid: 'collection' })));

    expect(readSearch('a')).toBeNull();
  });

  it('does not clear unrelated persisted state for a tab without a uid', () => {
    const { store } = setup([{ collectionUid: 'collection' }]);
    localStorage.setItem('persisted::unrelated::state', 'keep');

    act(() => store.dispatch(closeAllCollectionTabs({ collectionUid: 'collection' })));

    expect(localStorage.getItem('persisted::unrelated::state')).toBe('keep');
  });
});
