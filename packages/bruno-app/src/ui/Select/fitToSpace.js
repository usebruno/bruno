import { detectOverflow } from '@popperjs/core';

const MIN_LIST_HEIGHT = 100;
const EDGE_GAP = 8;
const DEFAULT_OFFSET_DISTANCE = 10;

export const getFittedMaxHeight = ({ available, max }) =>
  Math.max(0, Math.min(max, available, Math.max(MIN_LIST_HEIGHT, available - EDGE_GAP)));

export const getAvailableListHeight = ({ spaceBelow, distance, chrome }) => Math.floor(spaceBelow) - distance - chrome;

const getOffsetDistance = (state) => {
  const offset = state.orderedModifiers.find((modifier) => modifier.name === 'offset')?.options?.offset;
  return Array.isArray(offset) && Number.isFinite(offset[1]) ? offset[1] : DEFAULT_OFFSET_DISTANCE;
};

export const createFitToSpaceModifiers = (maxDropdownHeight) => [
  {
    name: 'fitToSpace',
    enabled: true,
    phase: 'main',
    requiresIfExists: ['offset'],
    fn: ({ state }) => {
      const overflow = detectOverflow(state, { boundary: document.documentElement, elementContext: 'reference' });
      const listbox = state.elements.popper.querySelector('[role="listbox"]');
      if (!listbox) {
        return;
      }
      const chrome = Math.max(0, state.rects.popper.height - listbox.offsetHeight);
      const available = getAvailableListHeight({
        spaceBelow: -overflow.bottom,
        distance: getOffsetDistance(state),
        chrome
      });
      const maxHeight = getFittedMaxHeight({ available, max: maxDropdownHeight });
      listbox.style.maxHeight = `${maxHeight}px`;
      state.rects.popper.height = Math.min(state.rects.popper.height, maxHeight + chrome);
    }
  },
  { name: 'flip', enabled: false }
];
