const { describe, it, expect } = require('@jest/globals');
import {
  DROP_PLACEMENTS,
  resolveCollectionItemDropPlacement,
  resolveCollectionDropPlacement
} from './drop-placement';

describe('drop placement helpers', () => {
  describe('resolveCollectionItemDropPlacement', () => {
    const rect = { top: 100, height: 40 };

    it('returns before for request targets in the upper half', () => {
      const placement = resolveCollectionItemDropPlacement({
        isFolder: false,
        rect,
        clientOffset: { y: 110 }
      });

      expect(placement).toBe(DROP_PLACEMENTS.BEFORE);
    });

    it('returns after for request targets in the lower half', () => {
      const placement = resolveCollectionItemDropPlacement({
        isFolder: false,
        rect,
        clientOffset: { y: 130 }
      });

      expect(placement).toBe(DROP_PLACEMENTS.AFTER);
    });

    it('returns inside for folder targets in the middle band', () => {
      const placement = resolveCollectionItemDropPlacement({
        isFolder: true,
        rect,
        clientOffset: { y: 120 }
      });

      expect(placement).toBe(DROP_PLACEMENTS.INSIDE);
    });

    it('returns before for folder targets in the upper band', () => {
      const placement = resolveCollectionItemDropPlacement({
        isFolder: true,
        rect,
        clientOffset: { y: 110 }
      });

      expect(placement).toBe(DROP_PLACEMENTS.BEFORE);
    });

    it('returns after for folder targets in the lower band', () => {
      const placement = resolveCollectionItemDropPlacement({
        isFolder: true,
        rect,
        clientOffset: { y: 130 }
      });

      expect(placement).toBe(DROP_PLACEMENTS.AFTER);
    });
  });

  describe('resolveCollectionDropPlacement', () => {
    const rect = { top: 200, height: 40 };

    it('keeps collection-item drags as inside on collection roots', () => {
      const placement = resolveCollectionDropPlacement({
        dragType: 'collection-item',
        rect,
        clientOffset: { y: 230 }
      });

      expect(placement).toBe(DROP_PLACEMENTS.INSIDE);
    });

    it('keeps collection-item drags as inside even without geometry', () => {
      const missingRectPlacement = resolveCollectionDropPlacement({
        dragType: 'collection-item',
        rect: null,
        clientOffset: { y: 230 }
      });

      const missingOffsetPlacement = resolveCollectionDropPlacement({
        dragType: 'collection-item',
        rect,
        clientOffset: null
      });

      expect(missingRectPlacement).toBe(DROP_PLACEMENTS.INSIDE);
      expect(missingOffsetPlacement).toBe(DROP_PLACEMENTS.INSIDE);
    });

    it('returns before for collection drags in the upper half', () => {
      const placement = resolveCollectionDropPlacement({
        dragType: 'collection',
        rect,
        clientOffset: { y: 210 }
      });

      expect(placement).toBe(DROP_PLACEMENTS.BEFORE);
    });

    it('returns after for collection drags in the lower half', () => {
      const placement = resolveCollectionDropPlacement({
        dragType: 'collection',
        rect,
        clientOffset: { y: 230 }
      });

      expect(placement).toBe(DROP_PLACEMENTS.AFTER);
    });
  });
});
