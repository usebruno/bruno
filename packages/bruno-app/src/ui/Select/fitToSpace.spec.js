import { detectOverflow } from '@popperjs/core';
import { createFitToSpaceModifiers, getAvailableListHeight, getFittedMaxHeight } from './fitToSpace';

jest.mock('@popperjs/core', () => ({ detectOverflow: jest.fn() }));

describe('getFittedMaxHeight', () => {
  it('uses the max height when there is plenty of room', () => {
    expect(getFittedMaxHeight({ available: 600, max: 250 })).toBe(250);
  });

  it('caps the height to the space below with an 8px gap', () => {
    expect(getFittedMaxHeight({ available: 240, max: 250 })).toBe(232);
  });

  it('gives up the gap to keep a 100px list', () => {
    expect(getFittedMaxHeight({ available: 104, max: 250 })).toBe(100);
  });

  it('never runs past the window edge, even under 100px', () => {
    expect(getFittedMaxHeight({ available: 60, max: 250 })).toBe(60);
    expect(getFittedMaxHeight({ available: -5, max: 250 })).toBe(0);
  });
});

describe('getAvailableListHeight', () => {
  it('subtracts the offset distance and box chrome from the space below', () => {
    expect(getAvailableListHeight({ spaceBelow: 260.6, distance: 10, chrome: 10 })).toBe(240);
  });
});

describe('fitToSpace modifier', () => {
  const buildState = ({ listbox = true, offset, chrome = 10, popperHeight = 300 } = {}) => {
    const popper = document.createElement('div');
    const list = document.createElement('div');
    list.setAttribute('role', 'listbox');
    Object.defineProperty(list, 'offsetHeight', { value: popperHeight - chrome });
    if (listbox) {
      popper.appendChild(list);
    }
    return {
      list,
      state: {
        elements: { popper },
        orderedModifiers: offset ? [{ name: 'offset', options: { offset } }] : [],
        rects: { popper: { height: popperHeight } }
      }
    };
  };
  const run = (state) => createFitToSpaceModifiers(250)[0].fn({ state });
  const spaceBelow = (value) => detectOverflow.mockReturnValue({ bottom: -value });

  it('caps the list and the popper rect when there is room below', () => {
    const { list, state } = buildState({ offset: [0, 10] });
    spaceBelow(260);

    run(state);

    expect(list.style.maxHeight).toBe('232px');
    expect(state.rects.popper.height).toBe(242);
  });

  it('stays inside the window and clamps the rect when space is short', () => {
    const { list, state } = buildState({ offset: [0, 10] });
    spaceBelow(100);

    run(state);

    expect(list.style.maxHeight).toBe('80px');
    expect(state.rects.popper.height).toBe(90);
  });

  it('measures the space below the trigger against its clipping parents', () => {
    const { state } = buildState({ offset: [0, 10] });
    spaceBelow(260);

    run(state);

    expect(detectOverflow).toHaveBeenCalledWith(state, { elementContext: 'reference' });
  });

  it('disables flip', () => {
    expect(createFitToSpaceModifiers(250).find((modifier) => modifier.name === 'flip')).toEqual({
      name: 'flip',
      enabled: false
    });
  });

  it('does nothing when the listbox is not mounted yet', () => {
    const { state } = buildState({ listbox: false });
    spaceBelow(260);

    expect(() => run(state)).not.toThrow();
    expect(state.rects.popper.height).toBe(300);
  });

  it('uses a 10px offset when no offset modifier is present', () => {
    const { list, state } = buildState();
    spaceBelow(260);

    run(state);

    expect(list.style.maxHeight).toBe('232px');
  });
});
