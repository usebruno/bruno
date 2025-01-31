import React from 'react';
import { flattenItems } from "utils/collections";
import { IconAlertTriangle } from '@tabler/icons';
import StyledWrapper from "./StyledWrapper";

const RequestsNotLoaded = ({ collection }) => {
  const flattenedItems = flattenItems(collection.items);
  const itemsFailedLoading = flattenedItems?.filter(item => item?.partial && !item?.loading);

  if (!itemsFailedLoading?.length) {
    return null;
  }

  return (
    <StyledWrapper className="w-full card my-2">
      <div className="flex items-center gap-2 px-3 py-2 title bg-yellow-50 dark:bg-yellow-900/20">
        <IconAlertTriangle size={16} className="text-yellow-500" />
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
          {flattenedItems?.map((item, index) => (
            item?.partial && !item?.loading ? (
              <tr key={index}>
                <td className="py-1.5 px-3">
                  {item?.pathname?.split(`${collection?.pathname}/`)?.[1]}
                </td>
                <td className="py-1.5 px-3">
                  {item?.size?.toFixed?.(2)}&nbsp;MB
                </td>
              </tr>
            ) : null
          ))}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default RequestsNotLoaded;
