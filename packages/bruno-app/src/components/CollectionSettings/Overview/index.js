import React, { useState } from 'react';
import StyledWrapper from "./StyledWrapper";
import Docs from "../Docs";
import Info from "./Info";
import { IconBox, IconChevronLeft, IconChevronRight } from '@tabler/icons';
import RequestsNotLoaded from "./RequestsNotLoaded";

const Overview = ({ collection }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="h-full">
      <div className="flex h-full">
        <div className={`transition-all duration-300 ${isExpanded ? 'w-0 opacity-0' : 'w-2/5 opacity-100'}`}>
          <div className="text-xl font-semibold flex items-center gap-2">
            <IconBox size={24} stroke={1.5} />
            {collection?.name}
          </div>
          <Info collection={collection} />
          <RequestsNotLoaded collection={collection} />
        </div>
        <div className="relative group/divider">
          <div className="w-[0.5px] bg-gray-200 dark:bg-gray-700 mx-6 h-full"></div>
          <button
            className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover/divider:opacity-100 group"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <IconChevronRight size={16} className="text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white" />
            ) : (
              <IconChevronLeft size={16} className="text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white" />
            )}
          </button>
        </div>
        <div className={`transition-all duration-300 ${isExpanded ? 'flex-1' : 'flex-1'}`}>
          <Docs collection={collection} />
        </div>
      </div>
    </div>
  );
}

export default Overview;