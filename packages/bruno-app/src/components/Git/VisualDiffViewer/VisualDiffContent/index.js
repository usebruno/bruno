import React, { useState, useEffect } from 'react';
import CollapsibleDiffRow from '../CollapsibleDiffRow';
import StyledWrapper from './StyledWrapper';

/**
 * VisualDiffContent - Presentational component for rendering visual diffs
 *
 * This is a reusable component that renders the visual diff UI.
 * It can be used by:
 * - Git VisualDiffViewer (for git diffs)
 * - OpenAPI ChangeSection (for spec diffs)
 *
 * Props:
 * - oldData: The "before" data
 * - newData: The "after" data
 * - sections: Array of section configs { key, title, Component, hasContent }
 * - sectionHasChanges: Function (sectionKey, oldData, newData) => boolean
 * - oldLabel: Label for the left/old pane (default: "Before")
 * - newLabel: Label for the right/new pane (default: "After")
 * - hideUnchanged: Hide sections without changes entirely (default: false)
 */
const VisualDiffContent = ({
  oldData,
  newData,
  sections,
  sectionHasChanges,
  oldLabel = 'Before',
  newLabel = 'After',
  hideUnchanged = false
}) => {
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Auto-collapse unchanged sections (collapsed but still visible)
  useEffect(() => {
    if (!sectionHasChanges || (!oldData && !newData)) return;

    const initialCollapsed = {};
    sections.forEach(({ key }) => {
      const hasChanges = sectionHasChanges(key, oldData, newData);
      initialCollapsed[key] = !hasChanges;
    });

    setCollapsedSections(initialCollapsed);
  }, [oldData, newData, sections, sectionHasChanges]);

  if (!oldData && !newData) {
    return (
      <StyledWrapper>
        <div className="empty-state">
          No content to display
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>

      <div className="visual-diff-content">
        <div className="diff-header-row">
          <div className="diff-header-pane old">{oldLabel}</div>
          <div className="diff-header-pane new">{newLabel}</div>
        </div>

        <div className="diff-sections">
          {sections.map(({ key, title, Component, hasContent: checkContent }) => {
            const hasOld = oldData && checkContent(oldData);
            const hasNew = newData && checkContent(newData);

            if (!hasOld && !hasNew) {
              return null;
            }

            // Hide sections without changes entirely when hideUnchanged is enabled
            if (hideUnchanged && sectionHasChanges && !sectionHasChanges(key, oldData, newData)) {
              return null;
            }

            return (
              <CollapsibleDiffRow
                key={key}
                title={title}
                isCollapsed={collapsedSections[key] || false}
                onToggle={() => toggleSection(key)}
                hasOldContent={hasOld}
                hasNewContent={hasNew}
                oldContent={
                  <Component oldData={oldData} newData={newData} showSide="old" />
                }
                newContent={
                  <Component oldData={oldData} newData={newData} showSide="new" />
                }
              />
            );
          })}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default VisualDiffContent;
