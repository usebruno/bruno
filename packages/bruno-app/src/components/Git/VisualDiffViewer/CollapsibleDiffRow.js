import React from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import { useTranslation } from 'react-i18next';

const CollapsibleDiffRow = ({ title, isCollapsed, onToggle, oldContent, newContent, hasOldContent, hasNewContent }) => {
  const { t } = useTranslation();

  if (!hasOldContent && !hasNewContent) {
    return null;
  }

  const emptyText = t('GIT.VISUAL_DIFF.NO_CONTENT');

  return (
    <div className="diff-row">
      <div className="diff-row-header" onClick={onToggle}>
        <span className="collapse-toggle">
          {isCollapsed ? (
            <IconChevronRight size={14} strokeWidth={2} />
          ) : (
            <IconChevronDown size={14} strokeWidth={2} />
          )}
        </span>
        <span className="diff-row-title">{title}</span>
      </div>
      {!isCollapsed && (
        <div className="diff-row-content">
          <div className="diff-row-pane old">
            {hasOldContent ? oldContent : <div className="empty-placeholder" data-empty-text={emptyText} />}
          </div>
          <div className="diff-row-pane new">
            {hasNewContent ? newContent : <div className="empty-placeholder" data-empty-text={emptyText} />}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollapsibleDiffRow;
