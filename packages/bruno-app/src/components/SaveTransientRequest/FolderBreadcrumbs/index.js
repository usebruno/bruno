import React from 'react';
import { IconChevronRight } from '@tabler/icons';

const FolderBreadcrumbs = ({
  collectionName,
  breadcrumbs,
  isAtRoot,
  onNavigateToRoot,
  onNavigateToBreadcrumb
}) => {
  return (
    <>
      <span
        className={!isAtRoot ? 'collection-name-breadcrumb' : ''}
        onClick={!isAtRoot ? onNavigateToRoot : undefined}
      >
        {collectionName}
      </span>
      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.uid}>
          <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />
          <span
            className="collection-name-breadcrumb"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToBreadcrumb(index);
            }}
          >
            {breadcrumb.name}
          </span>
        </React.Fragment>
      ))}
      {isAtRoot && <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />}
    </>
  );
};

export default FolderBreadcrumbs;
