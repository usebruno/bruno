import React, { useCallback, useState, useRef, Fragment, useMemo, useEffect } from 'react';
import get from 'lodash/get';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { saveRequest, saveCollectionRoot, saveFolderRoot, saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { deleteRequestDraft, deleteCollectionDraft, deleteFolderDraft, clearEnvironmentsDraft } from 'providers/ReduxStore/slices/collections';
import { clearGlobalEnvironmentDraft } from 'providers/ReduxStore/slices/global-environments';
import { saveGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import { findItemInCollection, hasRequestChanges } from 'utils/collections';
import ConfirmRequestClose from './ConfirmRequestClose';
import ConfirmCollectionClose from './ConfirmCollectionClose';
import ConfirmFolderClose from './ConfirmFolderClose';
import ConfirmCloseEnvironment from 'components/Environments/ConfirmCloseEnvironment';
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
import toast from 'react-hot-toast';

const RequestTab = ({ tab, collection, tabIndex, collectionRequestTabs, folderUid, hasOverflow, setHasOverflow, dropdownContainerRef }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const tabNameRef = useRef(null);
  const tabLabelRef = useRef(null);
  const lastOverflowStateRef = useRef(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showConfirmCollectionClose, setShowConfirmCollectionClose] = useState(false);
  const [showConfirmFolderClose, setShowConfirmFolderClose] = useState(false);
  const [showConfirmEnvironmentClose, setShowConfirmEnvironmentClose] = useState(false);
  const [showConfirmGlobalEnvironmentClose, setShowConfirmGlobalEnvironmentClose] = useState(false);

  const menuDropdownRef = useRef();

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
        tabUids: [tab.uid]
      })
    );
  };

  const handleRightClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    menuDropdownRef.current?.show();
  };

  const handleMouseUp = (e) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();

      // Close the tab
      dispatch(
        closeTabs({
          tabUids: [tab.uid]
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
  const hasEnvironmentDraft = tab.type === 'environment-settings' && collection?.environmentsDraft;
  const globalEnvironmentDraft = useSelector((state) => state.globalEnvironments.globalEnvironmentDraft);
  const hasGlobalEnvironmentDraft = tab.type === 'global-environment-settings' && globalEnvironmentDraft;

  const handleCloseEnvironmentSettings = (event) => {
    if (!collection?.environmentsDraft) {
      return handleCloseClick(event);
    }

    event.stopPropagation();
    event.preventDefault();
    setShowConfirmEnvironmentClose(true);
  };

  const handleCloseGlobalEnvironmentSettings = (event) => {
    if (!globalEnvironmentDraft) {
      return handleCloseClick(event);
    }

    event.stopPropagation();
    event.preventDefault();
    setShowConfirmGlobalEnvironmentClose(true);
  };

  if (['collection-settings', 'collection-overview', 'folder-settings', 'variables', 'collection-runner', 'environment-settings', 'global-environment-settings', 'preferences'].includes(tab.type)) {
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
                tabUids: [tab.uid]
              }));
              setShowConfirmCollectionClose(false);
            }}
            onSaveAndClose={() => {
              dispatch(saveCollectionRoot(collection.uid))
                .then(() => {
                  dispatch(closeTabs({
                    tabUids: [tab.uid]
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
                tabUids: [tab.uid]
              }));
              setShowConfirmFolderClose(false);
            }}
            onSaveAndClose={() => {
              dispatch(saveFolderRoot(collection.uid, folder.uid))
                .then(() => {
                  dispatch(closeTabs({
                    tabUids: [tab.uid]
                  }));
                  setShowConfirmFolderClose(false);
                })
                .catch((err) => {
                  console.log('err', err);
                });
            }}
          />
        )}
        {showConfirmEnvironmentClose && tab.type === 'environment-settings' && (
          <ConfirmCloseEnvironment
            isGlobal={false}
            onCancel={() => setShowConfirmEnvironmentClose(false)}
            onCloseWithoutSave={() => {
              dispatch(clearEnvironmentsDraft({ collectionUid: collection.uid }));
              dispatch(closeTabs({ tabUids: [tab.uid] }));
              setShowConfirmEnvironmentClose(false);
            }}
            onSaveAndClose={() => {
              const draft = collection.environmentsDraft;
              if (draft?.environmentUid && draft?.variables) {
                dispatch(saveEnvironment(draft.variables, draft.environmentUid, collection.uid))
                  .then(() => {
                    dispatch(clearEnvironmentsDraft({ collectionUid: collection.uid }));
                    dispatch(closeTabs({ tabUids: [tab.uid] }));
                    setShowConfirmEnvironmentClose(false);
                    toast.success('Environment saved');
                  })
                  .catch((err) => {
                    console.log('err', err);
                    toast.error('Failed to save environment');
                  });
              }
            }}
          />
        )}
        {showConfirmGlobalEnvironmentClose && tab.type === 'global-environment-settings' && (
          <ConfirmCloseEnvironment
            isGlobal={true}
            onCancel={() => setShowConfirmGlobalEnvironmentClose(false)}
            onCloseWithoutSave={() => {
              dispatch(clearGlobalEnvironmentDraft());
              dispatch(closeTabs({ tabUids: [tab.uid] }));
              setShowConfirmGlobalEnvironmentClose(false);
            }}
            onSaveAndClose={() => {
              const draft = globalEnvironmentDraft;
              if (draft?.environmentUid && draft?.variables) {
                dispatch(saveGlobalEnvironment({ variables: draft.variables, environmentUid: draft.environmentUid }))
                  .then(() => {
                    dispatch(clearGlobalEnvironmentDraft());
                    dispatch(closeTabs({ tabUids: [tab.uid] }));
                    setShowConfirmGlobalEnvironmentClose(false);
                    toast.success('Global environment saved');
                  })
                  .catch((err) => {
                    console.log('err', err);
                    toast.error('Failed to save global environment');
                  });
              }
            }}
          />
        )}
        {tab.type === 'folder-settings' && !folder ? (
          <RequestTabNotFound handleCloseClick={handleCloseClick} />
        ) : tab.type === 'folder-settings' ? (
          <SpecialTab handleCloseClick={handleCloseFolderSettings} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} tabName={folder?.name} hasDraft={hasFolderDraft} />
        ) : tab.type === 'collection-settings' ? (
          <SpecialTab handleCloseClick={handleCloseCollectionSettings} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} tabName={collection?.name} hasDraft={hasDraft} />
        ) : tab.type === 'environment-settings' ? (
          <SpecialTab handleCloseClick={handleCloseEnvironmentSettings} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} hasDraft={hasEnvironmentDraft} />
        ) : tab.type === 'global-environment-settings' ? (
          <SpecialTab handleCloseClick={handleCloseGlobalEnvironmentSettings} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} hasDraft={hasGlobalEnvironmentDraft} />
        ) : (
          <SpecialTab handleCloseClick={handleCloseClick} handleDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))} type={tab.type} />
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
        className="flex items-center justify-between tab-container"
        onMouseUp={(e) => {
          if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();

            dispatch(closeTabs({ tabUids: [tab.uid] }));
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
                tabUids: [tab.uid]
              })
            );
            setShowConfirmClose(false);
          }}
          onSaveAndClose={() => {
            dispatch(saveRequest(item.uid, collection.uid))
              .then(() => {
                dispatch(
                  closeTabs({
                    tabUids: [tab.uid]
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
        ref={tabLabelRef}
        className={`flex items-baseline tab-label ${tab.preview ? 'italic' : ''}`}
        onContextMenu={handleRightClick}
        onDoubleClick={() => dispatch(makeTabPermanent({ uid: tab.uid }))}
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
          menuDropdownRef={menuDropdownRef}
          tabLabelRef={tabLabelRef}
          tabIndex={tabIndex}
          collectionRequestTabs={collectionRequestTabs}
          collection={collection}
          dispatch={dispatch}
          dropdownContainerRef={dropdownContainerRef}
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

function RequestTabMenu({ menuDropdownRef, tabLabelRef, collectionRequestTabs, tabIndex, collection, dispatch, dropdownContainerRef }) {
  const [showCloneRequestModal, setShowCloneRequestModal] = useState(false);
  const [showAddNewRequestModal, setShowAddNewRequestModal] = useState(false);

  // Returns the tab-label's position for dropdown positioning.
  // Returns zero-sized rect if element isn't mounted yet (prevents Tippy errors).
  const getTabLabelRect = () => {
    if (!tabLabelRef.current) {
      return { width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 };
    }
    return tabLabelRef.current.getBoundingClientRect();
  };

  const totalTabs = collectionRequestTabs.length || 0;
  const currentTabUid = collectionRequestTabs[tabIndex]?.uid;
  const currentTabItem = findItemInCollection(collection, currentTabUid);
  const currentTabHasChanges = useMemo(() => hasRequestChanges(currentTabItem), [currentTabItem]);

  const hasLeftTabs = tabIndex !== 0;
  const hasRightTabs = totalTabs > tabIndex + 1;
  const hasOtherTabs = totalTabs > 1;

  async function handleCloseTab(tabUid) {
    if (!tabUid) {
      return;
    }

    try {
      const item = findItemInCollection(collection, tabUid);
      // silently save unsaved changes before closing the tab
      if (hasRequestChanges(item)) {
        await dispatch(saveRequest(item.uid, collection.uid, true));
      }

      dispatch(closeTabs({ tabUids: [tabUid] }));
    } catch (err) { }
  }

  function handleRevertChanges() {
    if (!currentTabUid) {
      return;
    }

    try {
      const item = findItemInCollection(collection, currentTabUid);
      if (item.draft) {
        dispatch(deleteRequestDraft({
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
      }
    } catch (err) { }
  }

  async function handleCloseOtherTabs() {
    const otherTabs = collectionRequestTabs.filter((_, index) => index !== tabIndex);
    await Promise.all(otherTabs.map((tab) => handleCloseTab(tab.uid)));
  }

  async function handleCloseTabsToTheLeft() {
    const leftTabs = collectionRequestTabs.filter((_, index) => index < tabIndex);
    await Promise.all(leftTabs.map((tab) => handleCloseTab(tab.uid)));
  }

  async function handleCloseTabsToTheRight() {
    const rightTabs = collectionRequestTabs.filter((_, index) => index > tabIndex);
    await Promise.all(rightTabs.map((tab) => handleCloseTab(tab.uid)));
  }

  function handleCloseSavedTabs() {
    const items = flattenItems(collection?.items);
    const savedTabs = items?.filter?.((item) => !hasRequestChanges(item));
    const savedTabIds = savedTabs?.map((item) => item.uid) || [];
    dispatch(closeTabs({ tabUids: savedTabIds }));
  }

  async function handleCloseAllTabs() {
    await Promise.all(collectionRequestTabs.map((tab) => handleCloseTab(tab.uid)));
  }

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
  ], [currentTabUid, currentTabItem, hasOtherTabs, hasLeftTabs, hasRightTabs, collection, collectionRequestTabs, tabIndex, dispatch]);

  const menuDropdown = (
    <MenuDropdown
      ref={menuDropdownRef}
      items={menuItems}
      placement="bottom-start"
      appendTo={dropdownContainerRef?.current || document.body}
      getReferenceClientRect={getTabLabelRect}
    >
      <span></span>
    </MenuDropdown>
  );

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

      {menuDropdown}
    </Fragment>
  );
}

export default RequestTab;
