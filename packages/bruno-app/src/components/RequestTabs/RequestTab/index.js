import React, { useCallback, useState, useRef, Fragment, useMemo, useEffect } from 'react';
import get from 'lodash/get';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { saveRequest, saveCollectionRoot, saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { deleteRequestDraft, deleteCollectionDraft, deleteFolderDraft } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import darkTheme from 'themes/dark';
import lightTheme from 'themes/light';
import { findItemInCollection, hasRequestChanges } from 'utils/collections';
import ConfirmRequestClose from './ConfirmRequestClose';
import ConfirmCollectionClose from './ConfirmCollectionClose';
import ConfirmFolderClose from './ConfirmFolderClose';
import RequestTabNotFound from './RequestTabNotFound';
import SpecialTab from './SpecialTab';
import StyledWrapper from './StyledWrapper';
import MenuDropdown from 'ui/MenuDropdown';
import CloneCollectionItem from 'components/Sidebar/Collections/Collection/CollectionItem/CloneCollectionItem/index';
import NewRequest from 'components/Sidebar/NewRequest/index';
import GradientCloseButton from './GradientCloseButton';
import { flattenItems } from 'utils/collections/index';
import { closeWsConnection } from 'utils/network/index';
import ExampleTab from '../ExampleTab';

const RequestTab = ({ tab, collection, tabIndex, collectionRequestTabs, folderUid, hasOverflow, setHasOverflow }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const theme = storedTheme === 'dark' ? darkTheme : lightTheme;
  const tabNameRef = useRef(null);
  const lastOverflowStateRef = useRef(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showConfirmCollectionClose, setShowConfirmCollectionClose] = useState(false);
  const [showConfirmFolderClose, setShowConfirmFolderClose] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const item = findItemInCollection(collection, tab.uid);

  const method = useMemo(() => {
    if (!item) return;
    switch (item.type) {
      case 'grpc-request':
        return 'gRPC';
      case 'ws-request':
        return 'WS';
      case 'graphql-request':
        return 'GQL';
      default:
        return item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');
    }
  }, [item]);

  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  const isWS = item?.type === 'ws-request';

  useEffect(() => {
    if (!item || !tabNameRef.current || !setHasOverflow) return;

    const checkOverflow = () => {
      if (tabNameRef.current && setHasOverflow) {
        const hasOverflow = tabNameRef.current.scrollWidth > tabNameRef.current.clientWidth;
        if (lastOverflowStateRef.current !== hasOverflow) {
          lastOverflowStateRef.current = hasOverflow;
          setHasOverflow(hasOverflow);
        }
      }
    };

    const timeoutId = setTimeout(checkOverflow, 0);
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    if (tabNameRef.current) {
      resizeObserver.observe(tabNameRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [item, item?.name, method, setHasOverflow]);

  const handleCloseClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    dispatch(
      closeTabs({
        tabUids: [tab.uid],
        location: 'request-pane'
      })
    );
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(true);
  };

  const handleMouseUp = (e) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();

      // Close the tab
      dispatch(
        closeTabs({
          tabUids: [tab.uid],
          location: 'request-pane'
        })
      );
    }
  };

  const getMethodColor = (method = '') => {
    const colorMap = {
      ...theme.request.methods,
      ...theme.request
    };
    return colorMap[method.toLocaleLowerCase()];
  };

  const handleCloseCollectionSettings = (event) => {
    if (!collection.draft) {
      return handleCloseClick(event);
    }

    event.stopPropagation();
    event.preventDefault();
    setShowConfirmCollectionClose(true);
  };

  const folder = folderUid ? findItemInCollection(collection, folderUid) : null;

  const handleCloseFolderSettings = (event) => {
    if (!folder?.draft) {
      return handleCloseClick(event);
    }

    event.stopPropagation();
    event.preventDefault();
    setShowConfirmFolderClose(true);
  };

  const hasDraft = tab.type === 'collection-settings' && collection?.draft;
  const hasFolderDraft = tab.type === 'folder-settings' && folder?.draft;

  if (['collection-settings', 'collection-overview', 'folder-settings', 'variables', 'collection-runner', 'security-settings'].includes(tab.type)) {
    return (
      <StyledWrapper
        className={`flex items-center justify-between tab-container px-2 ${tab.preview ? 'italic' : ''}`}
        onMouseUp={handleMouseUp}
      >
        {showConfirmCollectionClose && tab.type === 'collection-settings' && (
          <ConfirmCollectionClose
            collection={collection}
            onCancel={() => setShowConfirmCollectionClose(false)}
            onCloseWithoutSave={() => {
              dispatch(deleteCollectionDraft({
                collectionUid: collection.uid
              }));
              dispatch(closeTabs({
                tabUids: [tab.uid],
                location: 'request-pane'
              }));
              setShowConfirmCollectionClose(false);
            }}
            onSaveAndClose={() => {
              dispatch(saveCollectionRoot(collection.uid))
                .then(() => {
                  dispatch(closeTabs({
                    tabUids: [tab.uid],
                    location: 'request-pane'
                  }));
                  setShowConfirmCollectionClose(false);
                })
                .catch((err) => {
                  console.log('err', err);
                });
            }}
          />
        )}
        {showConfirmFolderClose && tab.type === 'folder-settings' && (
          <ConfirmFolderClose
            folder={folder}
            onCancel={() => setShowConfirmFolderClose(false)}
            onCloseWithoutSave={() => {
              dispatch(deleteFolderDraft({
                collectionUid: collection.uid,
                folderUid: folder.uid
              }));
              dispatch(closeTabs({
                tabUids: [tab.uid],
                location: 'request-pane'
              }));
              setShowConfirmFolderClose(false);
            }}
            onSaveAndClose={() => {
              dispatch(saveFolderRoot(collection.uid, folder.uid))
                .then(() => {
                  dispatch(closeTabs({
                    tabUids: [tab.uid],
                    location: 'request-pane'
                  }));
                  setShowConfirmFolderClose(false);
                })
                .catch((err) => {
                  console.log('err', err);
                });
            }}
          />
        )}
        {tab.type === 'folder-settings' && !folder ? (
          <RequestTabNotFound handleCloseClick={handleCloseClick} />
        ) : tab.type === 'folder-settings' ? (
          <SpecialTab handleCloseClick={handleCloseFolderSettings} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid, location: 'request-pane' }))} type={tab.type} tabName={folder?.name} hasDraft={hasFolderDraft} />
        ) : tab.type === 'collection-settings' ? (
          <SpecialTab handleCloseClick={handleCloseCollectionSettings} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid, location: 'request-pane' }))} type={tab.type} tabName={collection?.name} hasDraft={hasDraft} />
        ) : (
          <SpecialTab handleCloseClick={handleCloseClick} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid, location: 'request-pane' }))} type={tab.type} />
        )}
      </StyledWrapper>
    );
  }

  // Handle response-example tabs specially
  if (tab.type === 'response-example') {
    return (
      <ExampleTab
        tab={tab}
        collection={collection}
        tabIndex={tabIndex}
        collectionRequestTabs={collectionRequestTabs}
        folderUid={folderUid}
      />
    );
  }

  if (!item) {
    return (
      <StyledWrapper
        className="flex items-center justify-between tab-container px-1"
        onMouseUp={(e) => {
          if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();

            dispatch(closeTabs({ tabUids: [tab.uid], location: 'request-pane' }));
          }
        }}
      >
        <RequestTabNotFound handleCloseClick={handleCloseClick} />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="flex items-center justify-between tab-container px-2">
      {showConfirmClose && (
        <ConfirmRequestClose
          item={item}
          onCancel={() => setShowConfirmClose(false)}
          onCloseWithoutSave={() => {
            isWS && closeWsConnection(item.uid);
            dispatch(
              deleteRequestDraft({
                itemUid: item.uid,
                collectionUid: collection.uid
              })
            );
            dispatch(
              closeTabs({
                tabUids: [tab.uid],
                location: 'request-pane'
              })
            );
            setShowConfirmClose(false);
          }}
          onSaveAndClose={() => {
            dispatch(saveRequest(item.uid, collection.uid))
              .then(() => {
                dispatch(
                  closeTabs({
                    tabUids: [tab.uid],
                    location: 'request-pane'
                  })
                );
                setShowConfirmClose(false);
              })
              .catch((err) => {
                console.log('err', err);
              });
          }}
        />
      )}
      <div
        className={`flex items-baseline tab-label ${tab.preview ? 'italic' : ''}`}
        onContextMenu={handleRightClick}
        onDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid, location: 'request-pane' }))}
        onMouseUp={(e) => {
          if (!hasChanges) return handleMouseUp(e);

          if (e.button === 1) {
            e.stopPropagation();
            e.preventDefault();
            setShowConfirmClose(true);
          }
        }}
      >
        <span className="tab-method uppercase" style={{ color: getMethodColor(method) }}>
          {method}
        </span>
        <span ref={tabNameRef} className="ml-1 tab-name" title={item.name}>
          {item.name}
        </span>
        <RequestTabMenu
          tabIndex={tabIndex}
          collectionRequestTabs={collectionRequestTabs}
          collection={collection}
          dispatch={dispatch}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
      </div>
      <GradientCloseButton
        hasChanges={hasChanges}
        onClick={(e) => {
          if (!hasChanges) {
            isWS && closeWsConnection(item.uid);
            return handleCloseClick(e);
          }

          e.stopPropagation();
          e.preventDefault();
          setShowConfirmClose(true);
        }}
      />
    </StyledWrapper>
  );
};

function RequestTabMenu({ collectionRequestTabs, tabIndex, collection, dispatch, menuOpen, setMenuOpen }) {
  const [showCloneRequestModal, setShowCloneRequestModal] = useState(false);
  const [showAddNewRequestModal, setShowAddNewRequestModal] = useState(false);

  const totalTabs = collectionRequestTabs.length || 0;
  const currentTabUid = collectionRequestTabs[tabIndex]?.uid;
  const currentTabItem = findItemInCollection(collection, currentTabUid);

  const hasLeftTabs = tabIndex !== 0;
  const hasRightTabs = totalTabs > tabIndex + 1;
  const hasOtherTabs = totalTabs > 1;

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, [setMenuOpen]);

  const handleCloseTab = useCallback(async (tabUid) => {
    if (!tabUid) return;

    try {
      const item = findItemInCollection(collection, tabUid);
      // silently save unsaved changes before closing the tab
      if (hasRequestChanges(item)) {
        await dispatch(saveRequest(item.uid, collection.uid, true));
      }

      dispatch(closeTabs({ tabUids: [tabUid], location: 'request-pane' }));
    } catch (err) { }
  }, [collection, dispatch]);

  const handleRevertChanges = useCallback(() => {
    if (!currentTabUid) return;

    try {
      const item = findItemInCollection(collection, currentTabUid);
      if (item?.draft) {
        dispatch(deleteRequestDraft({
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
      }
    } catch (err) { }
  }, [currentTabUid, collection, dispatch]);

  const handleCloseOtherTabs = useCallback(() => {
    const otherTabs = collectionRequestTabs.filter((_, index) => index !== tabIndex);
    otherTabs.forEach((tab) => handleCloseTab(tab.uid));
  }, [collectionRequestTabs, tabIndex, handleCloseTab]);

  const handleCloseTabsToTheLeft = useCallback(() => {
    const leftTabs = collectionRequestTabs.filter((_, index) => index < tabIndex);
    leftTabs.forEach((tab) => handleCloseTab(tab.uid));
  }, [collectionRequestTabs, tabIndex, handleCloseTab]);

  const handleCloseTabsToTheRight = useCallback(() => {
    const rightTabs = collectionRequestTabs.filter((_, index) => index > tabIndex);
    rightTabs.forEach((tab) => handleCloseTab(tab.uid));
  }, [collectionRequestTabs, tabIndex, handleCloseTab]);

  const handleCloseSavedTabs = useCallback(() => {
    const items = flattenItems(collection?.items);
    const savedTabs = items?.filter?.((item) => !hasRequestChanges(item));
    const savedTabIds = savedTabs?.map((item) => item.uid) || [];
    dispatch(closeTabs({ tabUids: savedTabIds, location: 'request-pane' }));
  }, [collection, dispatch]);

  const handleCloseAllTabs = useCallback(() => {
    collectionRequestTabs.forEach((tab) => handleCloseTab(tab.uid));
  }, [collectionRequestTabs, handleCloseTab]);

  const menuItems = useMemo(() => [
    {
      id: 'new-request',
      label: 'New Request',
      onClick: () => setShowAddNewRequestModal(true)
    },
    {
      id: 'clone-request',
      label: 'Clone Request',
      onClick: () => setShowCloneRequestModal(true)
    },
    {
      id: 'revert-changes',
      label: 'Revert Changes',
      onClick: handleRevertChanges,
      disabled: !currentTabItem?.draft
    },
    { type: 'divider', id: 'divider-1' },
    {
      id: 'close',
      label: 'Close',
      onClick: () => handleCloseTab(currentTabUid)
    },
    {
      id: 'close-others',
      label: 'Close Others',
      onClick: handleCloseOtherTabs,
      disabled: !hasOtherTabs
    },
    {
      id: 'close-left',
      label: 'Close to the Left',
      onClick: handleCloseTabsToTheLeft,
      disabled: !hasLeftTabs
    },
    {
      id: 'close-right',
      label: 'Close to the Right',
      onClick: handleCloseTabsToTheRight,
      disabled: !hasRightTabs
    },
    { type: 'divider', id: 'divider-2' },
    {
      id: 'close-saved',
      label: 'Close Saved',
      onClick: handleCloseSavedTabs
    },
    {
      id: 'close-all',
      label: 'Close All',
      onClick: handleCloseAllTabs
    }
  ], [
    currentTabItem?.draft,
    currentTabUid,
    hasOtherTabs,
    hasLeftTabs,
    hasRightTabs,
    handleRevertChanges,
    handleCloseTab,
    handleCloseOtherTabs,
    handleCloseTabsToTheLeft,
    handleCloseTabsToTheRight,
    handleCloseSavedTabs,
    handleCloseAllTabs
  ]);

  return (
    <Fragment>
      {showAddNewRequestModal && (
        <NewRequest collectionUid={collection.uid} onClose={() => setShowAddNewRequestModal(false)} />
      )}

      {showCloneRequestModal && (
        <CloneCollectionItem
          item={currentTabItem}
          collectionUid={collection.uid}
          onClose={() => setShowCloneRequestModal(false)}
        />
      )}

      <MenuDropdown
        items={menuItems}
        opened={menuOpen}
        onChange={setMenuOpen}
        placement="bottom-start"
        showTickMark={false}
      >
        <span style={{ display: 'none' }} />
      </MenuDropdown>
    </Fragment>
  );
}

export default RequestTab;
