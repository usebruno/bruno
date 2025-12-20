import { interpolate } from '@usebruno/common';
import { isPlainObject, mapValues } from 'lodash-es';

/**
 * Traverses an object and interpolates any strings it finds.
 */
export const interpolateObject = (obj, variables) => {
  const seen = new WeakSet();

  const walk = (value) => {
    if (!value) return value;

    if (typeof value === 'string') {
      return interpolate(value, variables);
    }

    if (typeof value === 'object') {
      if (seen.has(value)) {
        throw new Error(
          'Circular reference detected during interpolation.'
        );
      }
      seen.add(value);
    }

    if (Array.isArray(value)) {
      return value.map(walk);
    }

    if (isPlainObject(value)) {
      return mapValues(value, walk);
    }

    return value;
  };

  return walk(obj);
};
