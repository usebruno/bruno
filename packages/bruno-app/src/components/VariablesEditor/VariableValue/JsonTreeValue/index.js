import React, { useLayoutEffect, useRef } from 'react';
import PrimitiveValue from '../PrimitiveValue';
import StyledWrapper from './StyledWrapper';

const isContainer = (value) => value !== null && typeof value === 'object';
const MAX_PREVIEW_ENTRIES = 5;

/** Compact type/value chip inside the collapsed object/array preview. */
const PreviewValue = ({ value, variables, onVarHover, onVarLeave }) => {
  if (value === null || value === undefined) {
    return <span className="v-null">null</span>;
  }
  if (Array.isArray(value)) {
    return <span className="preview-type">{`Array(${value.length})`}</span>;
  }
  if (typeof value === 'object') {
    return <span className="preview-type">Object</span>;
  }
  return (
    <PrimitiveValue
      value={value}
      variables={variables}
      onVarHover={onVarHover}
      onVarLeave={onVarLeave}
    />
  );
};

const PreviewList = ({ open, close, items, renderItem }) => {
  const shown = items.slice(0, MAX_PREVIEW_ENTRIES);
  const hasMore = items.length > MAX_PREVIEW_ENTRIES;

  return (
    <span className="object-preview">
      {open}
      {shown.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="preview-punct">, </span>}
          {renderItem(item, index)}
        </React.Fragment>
      ))}
      {hasMore && <span className="preview-punct">, …</span>}
      {close}
    </span>
  );
};

/** DevTools-style collapsed preview: {service: Object, endpoints: Array(3), …} */
const ObjectPreview = ({ value, variables, onVarHover, onVarLeave }) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="object-preview">[]</span>;
    return (
      <PreviewList
        open="["
        close="]"
        items={value}
        renderItem={(item) => (
          <PreviewValue
            value={item}
            variables={variables}
            onVarHover={onVarHover}
            onVarLeave={onVarLeave}
          />
        )}
      />
    );
  }

  const entries = Object.entries(value);
  if (entries.length === 0) return <span className="object-preview">{'{}'}</span>;

  return (
    <PreviewList
      open="{"
      close="}"
      items={entries}
      renderItem={([key, child]) => (
        <>
          <span className="preview-key">{key}</span>
          <span className="preview-punct">: </span>
          <PreviewValue
            value={child}
            variables={variables}
            onVarHover={onVarHover}
            onVarLeave={onVarLeave}
          />
        </>
      )}
    />
  );
};

// Nudge the tree scroll box after expand so children enter view (avoid scrollIntoView).
const revealChildrenInTree = (rowEl) => {
  if (!rowEl) return;
  const scroller = rowEl.closest('.value-tree-scroll');
  const childrenEl = rowEl.nextElementSibling;
  if (!scroller || !childrenEl) return;

  const scrollerRect = scroller.getBoundingClientRect();
  const hiddenBelow = childrenEl.getBoundingClientRect().bottom - scrollerRect.bottom;
  if (hiddenBelow <= 0) return;

  const roomAboveRow = rowEl.getBoundingClientRect().top - scrollerRect.top;
  scroller.scrollTop += Math.min(hiddenBelow, roomAboveRow);
};

const TreeNode = ({
  label,
  value,
  path,
  expanded,
  onToggle,
  variables,
  onVarHover,
  onVarLeave
}) => {
  const isContainerValue = isContainer(value);
  const isOpen = isContainerValue && expanded.has(path);
  const rowRef = useRef(null);
  const wasOpenRef = useRef(isOpen);

  useLayoutEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (justOpened) revealChildrenInTree(rowRef.current);
  }, [isOpen]);

  const labelNode = label !== null && (
    <>
      <span className="tkey">{label}</span>
      <span className="tsep">:</span>
    </>
  );

  if (!isContainerValue) {
    return (
      <div className="tnode">
        <div className="trow">
          <span className="caret leaf">▶</span>
          {labelNode}
          <PrimitiveValue
            value={value}
            variables={variables}
            onVarHover={onVarHover}
            onVarLeave={onVarLeave}
          />
        </div>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);

  return (
    <div className="tnode">
      <div
        className="trow expandable"
        ref={rowRef}
        data-testid="var-tree-row"
        role="button"
        tabIndex={0}
        onClick={() => onToggle?.(path)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle?.(path);
          }
        }}
      >
        <span className={`caret${isOpen ? ' open' : ''}`}>▶</span>
        {labelNode}
        <ObjectPreview
          value={value}
          variables={variables}
          onVarHover={onVarHover}
          onVarLeave={onVarLeave}
        />
      </div>
      {isOpen && (
        <div className="tchildren">
          {entries.map(([key, childValue]) => (
            <TreeNode
              key={key}
              label={isArray ? key : `"${key}"`}
              value={childValue}
              path={`${path}.${key}`}
              expanded={expanded}
              onToggle={onToggle}
              variables={variables}
              onVarHover={onVarHover}
              onVarLeave={onVarLeave}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const JsonTreeValue = ({
  value,
  expandedPaths,
  onToggle,
  variables,
  onVarHover,
  onVarLeave
}) => (
  <StyledWrapper className="json-tree" data-testid="var-json-tree">
    <TreeNode
      label={null}
      value={value}
      path="$"
      expanded={new Set(expandedPaths || [])}
      onToggle={onToggle}
      variables={variables}
      onVarHover={onVarHover}
      onVarLeave={onVarLeave}
    />
  </StyledWrapper>
);

export default JsonTreeValue;
