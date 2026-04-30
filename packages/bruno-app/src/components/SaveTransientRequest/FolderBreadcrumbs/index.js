import React from 'react';
import { IconChevronRight, IconDots } from '@tabler/icons';
import Dropdown from 'components/Dropdown';

const FolderBreadcrumbs = ({
  collectionName,
  breadcrumbs,
  isAtRoot,
  onNavigateToRoot,
  onNavigateToBreadcrumb
}) => {
  const collapsed = breadcrumbs.length > 1 ? breadcrumbs.slice(0, -1) : [];
  const last = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : null;

  return (
    <div className="breadcrumb-container">
      <span
        className={`breadcrumb-collection-name ${!isAtRoot ? 'collection-name-breadcrumb' : ''}`}
        onClick={!isAtRoot ? onNavigateToRoot : undefined}
        title={collectionName}
      >
        {collectionName}
      </span>

      {collapsed.length > 0 && (
        <>
          <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />
          <Dropdown
            placement="bottom-start"
            icon={(
              <span className="breadcrumb-ellipsis-btn">
                <IconDots size={16} strokeWidth={2} />
              </span>
            )}
          >
            <div className="breadcrumb-collapsed-dropdown">
              {collapsed.map((breadcrumb, i) => (
                <div
                  key={breadcrumb.uid}
                  className="dropdown-item breadcrumb-collapsed-item"
                  onClick={() => onNavigateToBreadcrumb(i)}
                  title={breadcrumb.name}
                >
                  {breadcrumb.name}
                </div>
              ))}
            </div>
          </Dropdown>
        </>
      )}

      {last && (
        <>
          <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />
          <span
            className="collection-name-breadcrumb breadcrumb-last"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToBreadcrumb(breadcrumbs.length - 1);
            }}
            title={last.name}
          >
            {last.name}
          </span>
        </>
      )}

      {isAtRoot && <IconChevronRight size={16} strokeWidth={1.5} className="collection-name-chevron" />}
    </div>
  );
};

export default FolderBreadcrumbs;
