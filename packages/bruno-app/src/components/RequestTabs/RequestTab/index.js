import React, { useState } from 'react';
import get from 'lodash/get';
import { closeTabs } from 'providers/ReduxStore/slices/tabs';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { deleteRequestDraft } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import { findItemInCollection } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import RequestTabNotFound from './RequestTabNotFound';
import ConfirmRequestClose from './ConfirmRequestClose';
import SpecialTab from './SpecialTab';
import { useTheme } from 'providers/Theme';
import darkTheme from 'themes/dark';
import lightTheme from 'themes/light';
import CloseTabIcon from './CloseTab/CloseTabIcon';
import DraftTabIcon from './CloseTab/DraftTabIcon';

const RequestTab = ({ tab, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const handleCloseClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    dispatch(
      closeTabs({
        tabUids: [tab.uid]
      })
    );
  };

  const getMethodColor = (method = '') => {
    const theme = storedTheme === 'dark' ? darkTheme : lightTheme;

    let color = '';
    method = method.toLocaleLowerCase();

    switch (method) {
      case 'get': {
        color = theme.request.methods.get;
        break;
      }
      case 'post': {
        color = theme.request.methods.post;
        break;
      }
      case 'put': {
        color = theme.request.methods.put;
        break;
      }
      case 'delete': {
        color = theme.request.methods.delete;
        break;
      }
      case 'patch': {
        color = theme.request.methods.patch;
        break;
      }
      case 'options': {
        color = theme.request.methods.options;
        break;
      }
      case 'head': {
        color = theme.request.methods.head;
        break;
      }
    }

    return color;
  };

  if (['collection-settings', 'variables', 'collection-runner'].includes(tab.type)) {
    return (
      <StyledWrapper className="flex items-center justify-between tab-container px-1">
        <SpecialTab handleCloseClick={handleCloseClick} type={tab.type} />
      </StyledWrapper>
    );
  }

  const item = findItemInCollection(collection, tab.uid);

  if (!item) {
    return (
      <StyledWrapper className="flex items-center justify-between tab-container px-1">
        <RequestTabNotFound handleCloseClick={handleCloseClick} />
      </StyledWrapper>
    );
  }

  const method = item.draft ? get(item, 'draft.request.method') : get(item, 'request.method');

  return (
    <StyledWrapper className="flex items-center justify-between tab-container px-1">
      {showConfirmClose && (
        <ConfirmRequestClose
          onCancel={() => setShowConfirmClose(false)}
          onCloseWithoutSave={() => {
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
      <div className="flex items-baseline tab-label pl-2">
        <span className="tab-method uppercase" style={{ color: getMethodColor(method), fontSize: 12 }}>
          {method}
        </span>
        <span className="ml-1 tab-name" title={item.name}>
          {item.name}
        </span>
      </div>
      <div
        className="flex px-2 close-icon-container"
        onClick={(e) => {
          if (!item.draft) return handleCloseClick(e);

          setShowConfirmClose(true);
        }}
      >
        {!item.draft ? (
          <CloseTabIcon />
        ) : (
          <DraftTabIcon />
        )}
      </div>
    </StyledWrapper>
  );
};

export default RequestTab;
