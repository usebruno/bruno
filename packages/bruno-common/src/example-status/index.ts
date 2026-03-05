import each from 'lodash/each';
import get from 'lodash/get';

interface Collection {
  items?: any[];
  [key: string]: any;
}

/**
 * Backward compatibility: Convert string status to number in examples
 * Old collections exported before the fix had status as string
 * This function ensures status is always a number for schema validation
 */
export const transformExampleStatusInCollection = (collection: Collection | Collection[]): Collection => {
  const transformItems = (items: any[] = []) => {
    each(items, (item) => {
      const examples = item.examples;
      if (examples && Array.isArray(examples)) {
        each(examples, (example) => {
          if (example.response && typeof example.response.status === 'string') {
            const statusValue = example.response.status;
            // Convert string status to number, default to null if conversion fails
            example.response.status = statusValue ? Number(statusValue) : null;
          }
        });
      }

      if (item.items && item.items.length) {
        transformItems(item.items);
      }
    });
  };

  if (Array.isArray(collection)) {
    collection.forEach((col) => transformItems(col.items));
  } else {
    transformItems(collection.items);
  }

  return collection;
};
