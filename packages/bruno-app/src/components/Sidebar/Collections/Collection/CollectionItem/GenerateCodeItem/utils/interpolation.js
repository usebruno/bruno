import { interpolate } from '@usebruno/common';
import { isPlainObject, mapValues } from 'lodash-es';

/**
 * Deeply traverses an object and interpolates any strings it finds.
 */
export const interpolateObject = (obj, variables) => {
  if (typeof obj === 'string') {
    return interpolate(obj, variables);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateObject(item, variables));
  }

  if (isPlainObject(obj)) {
    return mapValues(obj, (value) => interpolateObject(value, variables));
  }

  return obj;
};
