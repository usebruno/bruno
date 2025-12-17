import React, { useCallback, useState, useRef, Fragment, useMemo, useEffect } from 'react';
import get from 'lodash/get';
import { closeTabs, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { saveRequest, saveCollectionRoot, saveFolderRoot, saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { deleteRequestDraft, deleteCollectionDraft, deleteFolderDraft, clearEnvironmentsDraft } from 'providers/ReduxStore/slices/collections';
import { clearGlobalEnvironmentDraft } from 'providers/ReduxStore/slices/global-environments';
import { saveGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import darkTheme from 'themes/dark';
import lightTheme from 'themes/light';
import { findItemInCollection, hasRequestChanges } from 'utils/collections';
import ConfirmRequestClose from './ConfirmRequestClose';
import ConfirmCollectionClose from './ConfirmCollectionClose';
import ConfirmFolderClose from './ConfirmFolderClose';
import ConfirmCloseEnvironment from 'components/Environments/ConfirmCloseEnvironment';
import RequestTabNotFound from './RequestTabNotFound';
import SpecialTab from './SpecialTab';
import StyledWrapper from './StyledWrapper';
import Dropdown from 'components/Dropdown';
import CloneCollectionItem from 'components/Sidebar/Collections/Collection/CollectionItem/CloneCollectionItem/index';
import NewRequest from 'components/Sidebar/NewRequest/index';
import GradientCloseButton from './GradientCloseButton';
import { flattenItems } from 'utils/collections/index';
import { closeWsConnection } from 'utils/network/index';
import ExampleTab from '../ExampleTab';
import toast from 'react-hot-toast';

const RequestTab = ({ tab, collection, tabIndex, collectionRequestTabs, folderUid, hasOverflow, setHasOverflow }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const theme = storedTheme === 'dark' ? darkTheme : lightTheme;
  const tabNameRef = useRef(null);
  const lastOverflowStateRef = useRef(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showConfirmCollectionClose, setShowConfirmCollectionClose] = useState(false);
  const [showConfirmFolderClose, setShowConfirmFolderClose] = useState(false);
  const [showConfirmEnvironmentClose, setShowConfirmEnvironmentClose] = useState(false);
  const [showConfirmGlobalEnvironmentClose, setShowConfirmGlobalEnvironmentClose] = useState(false);

  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

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

  const handleRightClick = (_event) => {
    const menuDropdown = dropdownTippyRef.current;
    if (!menuDropdown) {
      return;
    }

    if (menuDropdown.state.isShown) {
      menuDropdown.hide();
    } else {
      menuDropdown.show();
    }
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

  if (['collection-settings', 'collection-overview', 'folder-settings', 'variables', 'collection-runner', 'security-settings', 'environment-settings', 'global-environment-settings'].includes(tab.type)) {
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

  const hasChanges = useMemo(() => hasRequestChanges(item), [item]);

  if (!item) {
    return (
      <StyledWrapper
        className="flex items-center justify-between tab-container px-1"
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

  const isWS = item.type === 'ws-request';

  useEffect(() => {
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
  }, [item.name, method, setHasOverflow]);

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
          onDropdownCreate={onDropdownCreate}
          tabIndex={tabIndex}
          collectionRequestTabs={collectionRequestTabs}
          tabItem={item}
          collection={collection}
          dropdownTippyRef={dropdownTippyRef}
          dispatch={dispatch}
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

function RequestTabMenu({ onDropdownCreate, collectionRequestTabs, tabIndex, collection, dropdownTippyRef, dispatch }) {
  const [showCloneRequestModal, setShowCloneRequestModal] = useState(false);
  const [showAddNewRequestModal, setShowAddNewRequestModal] = useState(false);

  const totalTabs = collectionRequestTabs.length || 0;
  const currentTabUid = collectionRequestTabs[tabIndex]?.uid;
  const currentTabItem = findItemInCollection(collection, currentTabUid);
  const currentTabHasChanges = useMemo(() => hasRequestChanges(currentTabItem), [currentTabItem]);

  const hasLeftTabs = tabIndex !== 0;
  const hasRightTabs = totalTabs > tabIndex + 1;
  const hasOtherTabs = totalTabs > 1;

  async function handleCloseTab(event, tabUid) {
    event.stopPropagation();
    dropdownTippyRef.current.hide();

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

  function handleRevertChanges(event) {
    event.stopPropagation();
    dropdownTippyRef.current.hide();

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

  function handleCloseOtherTabs(event) {
    dropdownTippyRef.current.hide();

    const otherTabs = collectionRequestTabs.filter((_, index) => index !== tabIndex);
    otherTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  function handleCloseTabsToTheLeft(event) {
    dropdownTippyRef.current.hide();

    const leftTabs = collectionRequestTabs.filter((_, index) => index < tabIndex);
    leftTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  function handleCloseTabsToTheRight(event) {
    dropdownTippyRef.current.hide();

    const rightTabs = collectionRequestTabs.filter((_, index) => index > tabIndex);
    rightTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

  function handleCloseSavedTabs(event) {
    event.stopPropagation();

    const items = flattenItems(collection?.items);
    const savedTabs = items?.filter?.((item) => !hasRequestChanges(item));
    const savedTabIds = savedTabs?.map((item) => item.uid) || [];
    dispatch(closeTabs({ tabUids: savedTabIds }));
  }

  function handleCloseAllTabs(event) {
    collectionRequestTabs.forEach((tab) => handleCloseTab(event, tab.uid));
  }

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

      <Dropdown onCreate={onDropdownCreate} icon={<span></span>} placement="bottom-start">
        <button
          className="dropdown-item w-full"
          onClick={() => {
            dropdownTippyRef.current.hide();
            setShowAddNewRequestModal(true);
          }}
        >
          New Request
        </button>
        <button
          className="dropdown-item w-full"
          onClick={() => {
            dropdownTippyRef.current.hide();
            setShowCloneRequestModal(true);
          }}
        >
          Clone Request
        </button>
        <button
          className="dropdown-item w-full"
          onClick={handleRevertChanges}
          disabled={!currentTabItem?.draft}
        >
          Revert Changes
        </button>
        <button className="dropdown-item w-full" onClick={(e) => handleCloseTab(e, currentTabUid)}>
          Close
        </button>
        <button disabled={!hasOtherTabs} className="dropdown-item w-full" onClick={handleCloseOtherTabs}>
          Close Others
        </button>
        <button disabled={!hasLeftTabs} className="dropdown-item w-full" onClick={handleCloseTabsToTheLeft}>
          Close to the Left
        </button>
        <button disabled={!hasRightTabs} className="dropdown-item w-full" onClick={handleCloseTabsToTheRight}>
          Close to the Right
        </button>
        <button className="dropdown-item w-full" onClick={handleCloseSavedTabs}>
          Close Saved
        </button>
        <button className="dropdown-item w-full" onClick={handleCloseAllTabs}>
          Close All
        </button>
      </Dropdown>
    </Fragment>
  );
}

export default RequestTab;
