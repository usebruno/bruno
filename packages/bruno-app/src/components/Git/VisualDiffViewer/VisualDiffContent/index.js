import React, { useState, useEffect } from 'react';
import isEqual from 'lodash/isEqual';
import get from 'lodash/get';
import CollapsibleDiffRow from '../CollapsibleDiffRow';
import StyledWrapper from './StyledWrapper';

const sectionDataPaths = {
  meta: ['name', 'type', 'seq', 'tags'],
  url: ['request.url', 'request.method'],
  params: 'request.params',
  headers: 'request.headers',
  auth: 'request.auth',
  body: 'request.body',
  vars: 'request.vars',
  assertions: 'request.assertions',
  script: ['request.script', 'request.tests'],
  settings: 'settings',
  docs: 'request.docs',
  examples: 'examples'
};

// Check if a section has changes between old and new data
const sectionHasChanges = (sectionKey, oldData, newData) => {
  const paths = sectionDataPaths[sectionKey];

  if (Array.isArray(paths)) {
    return paths.some((path) => !isEqual(get(oldData, path), get(newData, path)));
  }

  return !isEqual(get(oldData, paths), get(newData, paths));
};

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
 * - oldLabel: Label for the left/old pane (default: "Before")
 * - newLabel: Label for the right/new pane (default: "After")
 * - autoCollapseUnchanged: Auto-collapse sections without changes (default: true)
 */
const VisualDiffContent = ({
  oldData,
  newData,
  sections,
  oldLabel = 'Before',
  newLabel = 'After',
  autoCollapseUnchanged = true
}) => {
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Auto-collapse sections without changes
  useEffect(() => {
    if (!autoCollapseUnchanged || (!oldData && !newData)) return;

    const initialCollapsed = {};
    sections.forEach(({ key }) => {
      const hasChanges = sectionHasChanges(key, oldData, newData);
      initialCollapsed[key] = !hasChanges;
    });

    setCollapsedSections(initialCollapsed);
  }, [oldData, newData, sections, autoCollapseUnchanged]);

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

            // Hide sections without changes when autoCollapseUnchanged is enabled
            if (autoCollapseUnchanged && !sectionHasChanges(key, oldData, newData)) {
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
