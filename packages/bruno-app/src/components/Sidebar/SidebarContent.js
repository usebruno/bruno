import { Fragment, useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSidebarAccordion } from './SidebarAccordionContext';
import { updateSidebarSectionSizes, removeSidebarSectionSize } from 'providers/ReduxStore/slices/app';
import SidebarSectionSash from './SidebarSectionSash';
import {
  DEFAULT_SECTION_WEIGHT,
  NEW_SECTION_FRACTION,
  computeExpandWeight,
  resolveSashDrag
} from './sidebarSectionSizing';

/**
 * Renders the stacked sidebar sections. Expanded sections divide the available
 * height in proportion to their persisted weights (app.sidebarSectionSizes);
 * a draggable sash between two adjacent expanded sections resizes them.
 */
const SidebarContent = ({ sections }) => {
  const { isExpanded, setSectionExpanded } = useSidebarAccordion();
  const dispatch = useDispatch();
  const sizes = useSelector((state) => state.app.sidebarSectionSizes);

  // Live weights during a sash drag (committed to redux on mouseup).
  const [liveSizes, setLiveSizes] = useState(null);
  const wrapperRefs = useRef({});

  const expandedIds = sections.filter((s) => isExpanded(s.id)).map((s) => s.id);

  // Assign a ~20% default weight to any newly-expanded, never-sized section.
  useEffect(() => {
    const unsized = expandedIds.filter((id) => !(id in sizes));
    if (unsized.length === 0) return;

    const runningWeights = expandedIds
      .filter((id) => id in sizes)
      .map((id) => sizes[id]);
    const updates = {};
    unsized.forEach((id) => {
      const weight = computeExpandWeight(runningWeights, NEW_SECTION_FRACTION);
      updates[id] = weight;
      runningWeights.push(weight);
    });
    dispatch(updateSidebarSectionSizes(updates));
  }, [expandedIds.join('|'), sizes, dispatch]);

  const weightFor = (id) => liveSizes?.[id] ?? sizes[id] ?? DEFAULT_SECTION_WEIGHT;

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

  const makeSashHandlers = (aboveId, belowId, aboveIsTop) => {
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

        const result = resolveSashDrag({ abovePx, belowPx, deltaPx, combinedWeight, aboveIsTop });

        // Dragging a neighbor past its minimum, into the collapse zone, closes
        // that section (header only) instead of flooring at the min height.
        if (result.action === 'collapse') {
          const id = result.side === 'below' ? belowId : aboveId;
          startRef.current = null;
          setLiveSizes(null);
          dispatch(removeSidebarSectionSize(id));
          setSectionExpanded(id, false);
          return;
        }
        setLiveSizes({ [aboveId]: result.weightAbove, [belowId]: result.weightBelow });
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
              <SidebarSectionSash {...makeSashHandlers(prevSection.id, section.id, index - 1 === 0)} />
            )}
            <div
              className={wrapperClassName}
              ref={(node) => {
                wrapperRefs.current[section.id] = node;
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
