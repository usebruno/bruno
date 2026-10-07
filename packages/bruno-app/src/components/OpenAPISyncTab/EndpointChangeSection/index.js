import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconChevronRight } from '@tabler/icons';
import { toggleSectionExpanded } from 'providers/ReduxStore/slices/openapi-sync';

/**
 * Collapsible section container for endpoint lists.
 * Renders a clickable header (with chevron, dot, title, count) and a body of items.
 * Expand/collapse state is persisted in Redux via collectionUid + sectionKey.
 *
 * @param {string} title - Section heading
 * @param {string} type - CSS modifier for color theming (e.g. 'modified', 'missing', 'in-sync')
 * @param {Array} endpoints - Items to render; section is hidden when empty
 * @param {Function} renderItem - (endpoint, idx) => ReactNode
 * @param {boolean} [defaultExpanded=false] - Fallback when no Redux state exists
 * @param {boolean} [expandableLayout=false] - Removes max-height scroll constraint on body
 * @param {ReactNode} [actions] - Header-right buttons (wrapped in a stopPropagation container)
 * @param {string} [subtitle] - Secondary text after the count
 * @param {ReactNode} [headerExtra] - Extra content shown in header only when collapsed
 * @param {string} collectionUid - Redux key for persisting expand/collapse state
 * @param {string} sectionKey - Redux key for persisting expand/collapse state
 */
const EndpointChangeSection = ({
  title,
  type,
  endpoints,
  defaultExpanded = false,
  actions,
  subtitle,
  renderItem,
  expandableLayout = false,
  headerExtra,
  collectionUid,
  sectionKey
}) => {
  const dispatch = useDispatch();
  const reduxExpanded = useSelector((state) => {
    if (!collectionUid || !sectionKey) return undefined;
    return state.openapiSync?.tabUiState?.[collectionUid]?.expandedSections?.[sectionKey];
  });
  const isExpanded = reduxExpanded !== undefined ? reduxExpanded : defaultExpanded;

  if (endpoints.length === 0) return null;

  return (
    <div className={`change-section type-${type}${isExpanded ? ' expanded' : ''}`}>
      <div
        className="section-header"
        role="button"
        tabIndex={0}
        onClick={() => {
          if (collectionUid && sectionKey) {
            dispatch(toggleSectionExpanded({ collectionUid, sectionKey }));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (collectionUid && sectionKey) {
              dispatch(toggleSectionExpanded({ collectionUid, sectionKey }));
            }
          }
        }}
      >
        <IconChevronRight size={16} className={`chevron ${isExpanded ? 'expanded' : ''}`} />
        <span className={`section-dot type-${type}`} />
        <span className="section-title">{title}</span>
        <span className="section-count">{endpoints.length}</span>
        {subtitle && <span className="section-subtitle">{subtitle}</span>}
        {!isExpanded && headerExtra}
        {actions && <div className="section-actions" onClick={(e) => e.stopPropagation()}>{actions}</div>}
      </div>
      {isExpanded && (
        <div className={`section-body${expandableLayout ? ' expandable-mode' : ''}`}>
          {endpoints.map((endpoint, idx) => renderItem(endpoint, idx))}
        </div>
      )}
    </div>
  );
};

export default EndpointChangeSection;
