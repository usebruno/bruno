import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSidebarAccordion } from './SidebarAccordionContext';
import { updateSidebarSectionSizes, removeSidebarSectionSize } from 'providers/ReduxStore/slices/app';
import SidebarSectionSash from './SidebarSectionSash';
import {
  DEFAULT_SECTION_WEIGHT,
  MIN_SECTION_PX,
  computeSashTransfer,
  resolveExpandHeights
} from './sidebarSectionSizing';

/**
 * Renders the stacked sidebar sections. Expanded sections divide the available
 * height in proportion to their persisted weights (app.sidebarSectionSizes);
 * a draggable sash between two adjacent expanded sections resizes them. Dragging
 * only shrinks a section to its minimum — closing a section is done by clicking
 * its header (which clears its stored size so it reopens at the 1/N default).
 */
const SidebarContent = ({ sections }) => {
  const { isExpanded } = useSidebarAccordion();
  const dispatch = useDispatch();
  const sizes = useSelector((state) => state.app.sidebarSectionSizes);

  // Live weights during a sash drag (committed to redux on mouseup).
  const [liveSizes, setLiveSizes] = useState(null);
  const wrapperRefs = useRef({});

  const expandedIds = sections.filter((s) => isExpanded(s.id)).map((s) => s.id);

  const weightFor = (id) => liveSizes?.[id] ?? sizes[id] ?? DEFAULT_SECTION_WEIGHT;

  // Size a newly-expanded, never-sized section VSCode-style: it opens at 1/N of the
  // shared area, taking that space from the neighbour above it (cascading outward),
  // while the other sections keep their heights. Sizes are stored as target pixel
  // heights; flexGrowFor normalizes them back into flex-grow at render time.
  // useLayoutEffect (not useEffect) so the measure-and-resize happens before paint —
  // otherwise the new section flashes at its min height for one frame.
  useLayoutEffect(() => {
    const unsized = expandedIds.filter((id) => !(id in sizes));
    if (unsized.length === 0) return;

    // With more than one unsized section at once (e.g. restored from a snapshot),
    // seed the extra ones first so the cascade below always runs against fully
    // sized neighbours; the primary new section is then sized on the next pass.
    const [newId, ...extraUnsized] = unsized;
    if (extraUnsized.length > 0) {
      const seed = {};
      extraUnsized.forEach((id) => { seed[id] = DEFAULT_SECTION_WEIGHT; });
      dispatch(updateSidebarSectionSizes(seed));
      return;
    }

    const oldIds = expandedIds.filter((id) => id !== newId);
    // The only expanded section fills on its own — no neighbour to take space from.
    if (oldIds.length === 0) {
      dispatch(updateSidebarSectionSizes({ [newId]: DEFAULT_SECTION_WEIGHT }));
      return;
    }

    // Shared area = the height currently filled by the expanded sections.
    const areaPx = expandedIds.reduce(
      (sum, id) => sum + (wrapperRefs.current[id]?.getBoundingClientRect().height || 0),
      0
    );
    if (areaPx <= 0) {
      dispatch(updateSidebarSectionSizes({ [newId]: DEFAULT_SECTION_WEIGHT }));
      return;
    }

    // Reconstruct the neighbours' pre-expand heights from their weights (avoids the
    // transient height the new section briefly takes before this effect runs).
    const oldWeightSum = oldIds.reduce((sum, id) => sum + weightFor(id), 0) || 1;
    const oldHeights = oldIds.map((id) => (weightFor(id) / oldWeightSum) * areaPx);

    const heights = resolveExpandHeights({
      oldHeights,
      newIndex: expandedIds.indexOf(newId),
      areaPx,
      minPx: MIN_SECTION_PX
    });

    const updates = {};
    expandedIds.forEach((id, i) => { updates[id] = heights[i]; });
    dispatch(updateSidebarSectionSizes(updates));
  }, [expandedIds.join('|'), sizes, dispatch]);

  // A section closed from its header drops its stored size, so it reopens at the
  // 1/N default rather than its last dragged height.
  useEffect(() => {
    Object.keys(sizes).forEach((id) => {
      if (!expandedIds.includes(id)) dispatch(removeSidebarSectionSize(id));
    });
  }, [expandedIds.join('|'), sizes, dispatch]);

  // Normalize the rendered flex-grow across expanded sections so it always sums
  // to the expanded count (>= 1). CSS distributes only a fraction of the free
  // space when the flex-grow values sum to less than 1, which would leave a
  // single low-weight section short of filling. Ratios are preserved.
  const expandedWeightSum = expandedIds.reduce((sum, id) => sum + weightFor(id), 0);
  const flexGrowFor = (id) =>
    (expandedWeightSum > 0 ? (weightFor(id) / expandedWeightSum) * expandedIds.length : 1);

  const getWrapperClassName = (section) => {
    const classes = ['accordion-section-wrapper'];
    if (isExpanded(section.id)) classes.push('expanded-wrapper');
    return classes.join(' ');
  };

  const makeSashHandlers = (aboveId, belowId) => {
    // Captured once at drag start. The drag delta is measured from the start
    // position, so it must apply to the heights as they were then — re-reading
    // the live (already-resized) heights each move would compound the delta.
    const startRef = { current: null };
    return {
      onDragStart: () => {
        const aboveEl = wrapperRefs.current[aboveId];
        const belowEl = wrapperRefs.current[belowId];
        if (!aboveEl || !belowEl) return;
        startRef.current = {
          abovePx: aboveEl.getBoundingClientRect().height,
          belowPx: belowEl.getBoundingClientRect().height,
          combinedWeight: weightFor(aboveId) + weightFor(belowId)
        };
      },
      onDrag: (deltaPx) => {
        if (!startRef.current) return;
        const { abovePx, belowPx, combinedWeight } = startRef.current;
        // Clamps at the minimum height — dragging never collapses a section.
        const { weightAbove, weightBelow } = computeSashTransfer({
          abovePx,
          belowPx,
          deltaPx,
          combinedWeight,
          minPx: MIN_SECTION_PX
        });
        setLiveSizes({ [aboveId]: weightAbove, [belowId]: weightBelow });
      },
      onDragEnd: () => {
        startRef.current = null;
        setLiveSizes((current) => {
          if (current) dispatch(updateSidebarSectionSizes(current));
          return null;
        });
      }
    };
  };

  return (
    <>
      {sections.map((section, index) => {
        const SectionComponent = section.component;
        const wrapperClassName = getWrapperClassName(section);
        const expanded = isExpanded(section.id);

        // A sash sits before this section when both it and the previous
        // section are expanded (two adjacent expanded neighbors).
        const prevSection = sections[index - 1];
        const showSashBefore = expanded && prevSection && isExpanded(prevSection.id);

        return (
          <Fragment key={section.id}>
            {showSashBefore && (
              <SidebarSectionSash {...makeSashHandlers(prevSection.id, section.id)} />
            )}
            <div
              className={wrapperClassName}
              ref={(node) => {
                if (node) wrapperRefs.current[section.id] = node;
                else delete wrapperRefs.current[section.id];
              }}
              style={expanded ? { flexGrow: flexGrowFor(section.id), flexBasis: 0 } : undefined}
            >
              <SectionComponent />
            </div>
          </Fragment>
        );
      })}
    </>
  );
};

export default SidebarContent;
