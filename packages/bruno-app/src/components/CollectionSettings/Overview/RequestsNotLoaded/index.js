import React, { useMemo } from 'react';
import { flattenItems } from 'utils/collections';
import { IconAlertTriangle } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useDispatch, useSelector } from 'react-redux';
import { isItemARequest, itemIsOpenedInTabs } from 'utils/tabs/index';
import { getDefaultRequestPaneTab } from 'utils/collections/index';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { normalizePath } from 'utils/common/path';

const toRelativePathname = (pathname, collectionPathname) => {
  if (!pathname || !collectionPathname) return pathname;
  const normalizedPathname = normalizePath(pathname);
  const normalizedCollection = normalizePath(collectionPathname);
  if (normalizedPathname.toLowerCase().startsWith(normalizedCollection.toLowerCase())) {
    return normalizedPathname.slice(normalizedCollection.length + 1);
  }
  return pathname;
};

const RequestsNotLoaded = ({ collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);

  const itemsFailedLoading = useMemo(() => {
    return flattenItems(collection.items)?.filter((item) => {
      return (item?.partial && !item?.loading) || item?.error;
    }) ?? [];
  }, [collection.items]);

  if (!itemsFailedLoading.length) {
    return null;
  }

  const handleRequestClick = (item) => (e) => {
    e.preventDefault();
    if (isItemARequest(item)) {
      if (itemIsOpenedInTabs(item, tabs)) {
        dispatch(
          focusTab({
            uid: item.uid
          })
        );
        return;
      }
      dispatch(
        addTab({
          uid: item.uid,
          collectionUid: collection.uid,
          requestPaneTab: getDefaultRequestPaneTab(item)
        })
      );
      return;
    }
  };

  return (
    <StyledWrapper className="w-full card my-2">
      <div className="flex items-center gap-2 px-3 py-2 title">
        <IconAlertTriangle size={16} className="warning-icon" />
        <span className="font-medium">Following requests were not loaded</span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="py-2 px-3 text-left font-medium">
              Pathname
            </th>
            <th className="py-2 px-3 text-left font-medium">
              Size
            </th>
          </tr>
        </thead>
        <tbody>
          {itemsFailedLoading.map((item) => (
            <tr key={item?.pathname} className="cursor-pointer" onClick={handleRequestClick(item)}>
              <td className="py-1.5 px-3">
                {toRelativePathname(item?.pathname, collection?.pathname)}
              </td>
              <td className="py-1.5 px-3">
                {item?.size ? `${item.size?.toFixed?.(2)} MB` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default RequestsNotLoaded;
