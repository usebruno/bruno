import React from 'react';
import { flattenItems } from "utils/collections";
import { IconAlertTriangle } from '@tabler/icons';
import StyledWrapper from "./StyledWrapper";
import { useDispatch, useSelector } from 'react-redux';
import { isItemARequest, itemIsOpenedInTabs } from 'utils/tabs/index';
import { getDefaultRequestPaneTab } from 'utils/collections/index';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { hideHomePage } from 'providers/ReduxStore/slices/app';
import styled from 'styled-components';

const Separator = styled.div`
  border-top: 1px solid ${(props) => props.theme.table?.border || props.theme.requestTabPanel?.cardTable?.border || '#efefef'};
  margin: 16px 0;
`;

const TableRow = styled.tr`
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid ${(props) => props.theme.table?.border || '#efefef'};

  &:hover {
    background-color: ${(props) => props.theme.plainGrid?.hoverBg || 'rgba(0, 0, 0, 0.02)'};
  }
`;

const TableHeader = styled.tr`
  background-color: ${(props) => props.theme.requestTabPanel?.cardTable?.table?.thead?.bg || props.theme.table?.striped || '#f3f3f3'};
`;

const TableHeaderCell = styled.th`
  color: ${(props) => props.theme.requestTabPanel?.cardTable?.table?.thead?.color || props.theme.table?.thead?.color || '#616161'};
`;

const RequestsNotLoaded = ({ collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const flattenedItems = flattenItems(collection.items);
  const itemsFailedLoading = flattenedItems?.filter(item => item?.partial && !item?.loading);

  if (!itemsFailedLoading?.length) {
    return null;
  }

  const handleRequestClick = (item) => e => {
    e.preventDefault();
    if (isItemARequest(item)) {
      dispatch(hideHomePage());
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
  }

  return (
    <>
      <Separator />
      <div className="w-full overflow-hidden mt-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-shrink-0 p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <IconAlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" stroke={1.5} />
          </div>
          <div className="ml-4">
            <div className="font-medium text-[13px] text-gray-900 dark:text-gray-100">Following requests were not loaded</div>
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse">
            <thead>
              <TableHeader>
                <TableHeaderCell className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wider">
                  Pathname
                </TableHeaderCell>
                <TableHeaderCell className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wider">
                  Size
                </TableHeaderCell>
              </TableHeader>
            </thead>
            <tbody>
              {flattenedItems?.map((item, index) => (
                item?.partial && !item?.loading ? (
                  <TableRow
                    key={index}
                    onClick={handleRequestClick(item)}
                  >
                    <td className="py-2.5 px-4 text-xs text-gray-900 dark:text-gray-100">
                      {item?.pathname?.split(`${collection?.pathname}/`)?.[1]}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-600 dark:text-gray-400">
                      {item?.size?.toFixed?.(2)}&nbsp;MB
                    </td>
                  </TableRow>
                ) : null
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default RequestsNotLoaded;
